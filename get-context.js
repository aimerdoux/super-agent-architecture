/**
 * Unified Context & Memory Retrieval Script
 * Fetches conversation history and memory from OpenClaw's system
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuration
const WORKSPACE = process.env.OPENCLAW_WORKSPACE || path.join(process.env.USERPROFILE || '', '.openclaw', 'workspace');
const MEMORY_DIR = path.join(WORKSPACE, 'memory');
const MEMORY_FILE = path.join(WORKSPACE, 'MEMORY.md');
const DAILY_DIR = path.join(WORKSPACE, 'memory');

// ============== DATE UTILITIES ==============

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getYesterday() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function getNDaysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

// ============== FILE OPERATIONS ==============

function readIfExists(filePath) {
  try {
    return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8') : null;
  } catch {
    return null;
  }
}

function findMemoryFiles() {
  const files = [];
  
  // Main memory file
  if (fs.existsSync(MEMORY_FILE)) {
    files.push({ name: 'MEMORY.md', path: MEMORY_FILE, type: 'long-term' });
  }
  
  // Daily memory files
  if (fs.existsSync(DAILY_DIR)) {
    fs.readdirSync(DAILY_DIR)
      .filter(f => f.endsWith('.md') && f !== 'MEMORY.md')
      .sort()
      .reverse()
      .forEach(f => {
        files.push({ name: f, path: path.join(DAILY_DIR, f), type: 'daily' });
      });
  }
  
  return files;
}

// ============== OPENCLAW CLI INTEGRATION ==============

function getOpenclawSessions() {
  try {
    // Try to get sessions via OpenClaw CLI if available
    const result = execSync('openclaw sessions list --json 2>&3', { 
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    // Try to parse as JSON
    const parsed = JSON.parse(result);
    return parsed.sessions || parsed || [];
  } catch {
    // OpenClaw CLI not available or not configured
    return null;
  }
}

function getSessionHistory(sessionKey) {
  try {
    const result = execSync(`openclaw sessions history ${sessionKey} --json 2>&3`, {
      encoding: 'utf-8',
      timeout: 10000,
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    const parsed = JSON.parse(result);
    return parsed.messages || parsed || [];
  } catch {
    return null;
  }
}

// ============== CONTEXT RETRIEVAL ==============

function getMemoryContext(days = 7) {
  const files = findMemoryFiles();
  const cutoffDate = getNDaysAgo(days);
  
  const context = {
    longTerm: null,
    recent: [],
    older: []
  };
  
  // Check today/yesterday specifically for "recent"
  const recentDates = new Set([getToday(), getYesterday()]);
  
  files.forEach(file => {
    const content = readIfExists(file.path);
    if (!content) return;
    
    const dateMatch = file.name.match(/(\d{4}-\d{2}-\d{2})/);
    const fileDate = dateMatch ? dateMatch[1] : null;
    
    if (file.name === 'MEMORY.md') {
      context.longTerm = content;
    } else if (fileDate && fileDate >= cutoffDate) {
      context.recent.push({ name: file.name, content });
    } else {
      context.older.push({ name: file.name, content });
    }
  });
  
  return context;
}

// ============== SEARCH ==============

function searchMemory(query) {
  const files = findMemoryFiles();
  const results = [];
  const lowerQ = query.toLowerCase();
  
  files.forEach(file => {
    const content = readIfExists(file.path);
    if (!content) return;
    
    if (content.toLowerCase().includes(lowerQ)) {
      results.push({
        file: file.name,
        type: file.type,
        matched: true
      });
    }
  });
  
  return results;
}

// ============== DISPLAY ==============

function printContext(options = {}) {
  const { showAll = false, days = 7, search = null } = options;
  
  console.log('\n' + '='.repeat(60));
  console.log('📚 OPENCLAW CONTEXT RETRIEVAL');
  console.log('='.repeat(60));
  
  if (search) {
    console.log(`\n🔍 Searching for: "${search}"`);
    const results = searchMemory(search);
    
    if (results.length === 0) {
      console.log('   No matches found in memory files.');
    } else {
      results.forEach(r => {
        console.log(`   ✓ ${r.file} (${r.type})`);
      });
    }
  } else {
    console.log(`\n📅 Memory files (last ${days} days):\n`);
    
    const context = getMemoryContext(days);
    
    // Long-term memory
    console.log('LONG-TERM MEMORY (MEMORY.md)');
    console.log('-'.repeat(40));
    if (context.longTerm) {
      console.log(context.longTerm);
    } else {
      console.log('(none)');
    }
    
    // Recent daily memory
    if (context.recent.length > 0) {
      console.log('\n\nRECENT DAILY NOTES');
      console.log('-'.repeat(40));
      context.recent.forEach(f => {
        console.log(`\n### ${f.name}`);
        console.log(f.content);
      });
    }
    
    // Older files
    if (showAll && context.older.length > 0) {
      console.log('\n\nOLDER MEMORY FILES');
      console.log('-'.repeat(40));
      context.older.forEach(f => {
        console.log(`\n### ${f.name}`);
        console.log(f.content);
      });
    }
  }
  
  // OpenClaw sessions
  console.log('\n\n📱 OPENCLAW SESSIONS');
  console.log('-'.repeat(40));
  
  const sessions = getOpenclawSessions();
  if (sessions && sessions.length > 0) {
    sessions.forEach((s, i) => {
      console.log(`${i + 1}. ${s.label || s.key || 'unnamed'} (${s.kind || 'unknown'})`);
      console.log(`   Last active: ${s.lastActive || 'unknown'}`);
    });
  } else {
    console.log('(no recent sessions found - is OpenClaw running?)');
    console.log('   Tip: Run "openclaw sessions list" to check');
  }
  
  console.log('\n' + '='.repeat(60) + '\n');
}

// ============== MAIN ==============

function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Context Retrieval for OpenClaw

Usage: node get-context.js [options]

Options:
  --all, -a       Show all memory files (not just recent)
  --days, -d N    Number of days of memory to retrieve (default: 7)
  --search, -s Q  Search memory for a specific query
  --help, -h      Show this help

Examples:
  node get-context.js                    # Show all context
  node get-context.js --all              # Include older files
  node get-context.js --days 14          # Last 2 weeks
  node get-context.js --search "project" # Search for "project"
`);
    process.exit(0);
  }
  
  const showAll = args.includes('--all') || args.includes('-a');
  const searchIdx = args.findIndex(a => a === '--search' || a === '-s');
  const search = searchIdx > -1 ? args[searchIdx + 1] : null;
  
  printContext({ showAll, search });
}

// Export for use as module
module.exports = {
  getMemoryContext,
  searchMemory,
  getOpenclawSessions,
  getSessionHistory
};

// Run if executed directly
if (require.main === module) {
  main();
}
