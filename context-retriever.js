/**
 * Context Retriever
 * Fetches previous conversations and memory from OpenClaw's memory system
 */

const fs = require('fs');
const path = require('path');

const MEMORY_DIR = path.join(__dirname, 'memory');
const MEMORY_FILE = path.join(__dirname, 'MEMORY.md');

/**
 * Get today's date string (YYYY-MM-DD)
 */
function getToday() {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get yesterday's date string
 */
function getYesterday() {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split('T')[0];
}

/**
 * Read a file if it exists
 */
function readFile(filePath) {
  try {
    if (fs.existsSync(filePath)) {
      return fs.readFileSync(filePath, 'utf-8');
    }
  } catch (err) {
    console.error(`Error reading ${filePath}:`, err.message);
  }
  return null;
}

/**
 * Get all memory file paths
 */
function getMemoryFiles() {
  const files = [];
  
  // Add MEMORY.md (long-term memory)
  if (fs.existsSync(MEMORY_FILE)) {
    files.push({ name: 'MEMORY.md', path: MEMORY_FILE, type: 'long-term' });
  }
  
  // Add daily memory files
  if (fs.existsSync(MEMORY_DIR)) {
    const today = getToday();
    const yesterday = getYesterday();
    
    // Check for today and yesterday
    const dailyFiles = ['MEMORY.md', `${today}.md`, `${yesterday}.md`];
    
    fs.readdirSync(MEMORY_DIR).forEach(file => {
      if (file.endsWith('.md') && !dailyFiles.includes(file)) {
        files.push({ 
          name: file, 
          path: path.join(MEMORY_DIR, file), 
          type: 'daily' 
        });
      }
    });
  }
  
  return files;
}

/**
 * Retrieve all context
 */
function getAllContext() {
  const files = getMemoryFiles();
  const context = {
    longTerm: [],
    daily: [],
    recent: []
  };
  
  // Check today and yesterday specifically
  const recentDates = [getToday(), getYesterday()];
  
  files.forEach(file => {
    const content = readFile(file.path);
    if (content) {
      const entry = {
        name: file.name,
        content: content
      };
      
      if (file.type === 'long-term') {
        context.longTerm.push(entry);
      } else if (recentDates.some(d => file.name.includes(d))) {
        context.recent.push(entry);
      } else {
        context.daily.push(entry);
      }
    }
  });
  
  return context;
}

/**
 * Search memory files for a query
 */
function searchMemory(query) {
  const files = getMemoryFiles();
  const results = [];
  const lowerQuery = query.toLowerCase();
  
  files.forEach(file => {
    const content = readFile(file.path);
    if (content && content.toLowerCase().includes(lowerQuery)) {
      // Find relevant snippets
      const lines = content.split('\n');
      const matches = [];
      
      lines.forEach((line, index) => {
        if (line.toLowerCase().includes(lowerQuery)) {
          // Get surrounding context (2 lines before and after)
          const start = Math.max(0, index - 2);
          const end = Math.min(lines.length - 1, index + 2);
          matches.push({
            line: index + 1,
            context: lines.slice(start, end + 1).join('\n')
          });
        }
      });
      
      if (matches.length > 0) {
        results.push({
          file: file.name,
          path: file.path,
          matches: matches
        });
      }
    }
  });
  
  return results;
}

/**
 * Main display function
 */
function displayContext(options = {}) {
  const { showAll = false, search = null } = options;
  
  if (search) {
    console.log(`\n🔍 Searching memory for: "${search}"`);
    const results = searchMemory(search);
    
    if (results.length === 0) {
      console.log('No matches found.');
    } else {
      results.forEach(result => {
        console.log(`\n📄 ${result.file}`);
        result.matches.forEach(match => {
          console.log(`   Line ${match.line}:`);
          console.log(`   ${match.context.split('\n').join('\n   ')}`);
        });
      });
    }
    return results;
  }
  
  const context = getAllContext();
  
  console.log('\n📚 LONG-TERM MEMORY (MEMORY.md)');
  console.log('='.repeat(50));
  if (context.longTerm.length > 0) {
    context.longTerm.forEach(f => console.log(f.content));
  } else {
    console.log('(none)');
  }
  
  console.log('\n\n🗓️ RECENT (Today & Yesterday)');
  console.log('='.repeat(50));
  if (context.recent.length > 0) {
    context.recent.forEach(f => console.log(`\n### ${f.name}\n${f.content}`));
  } else {
    console.log('(none)');
  }
  
  if (showAll) {
    console.log('\n\n📁 OLDER MEMORY FILES');
    console.log('='.repeat(50));
    if (context.daily.length > 0) {
      context.daily.forEach(f => console.log(`\n### ${f.name}\n${f.content}`));
    } else {
      console.log('(none)');
    }
  }
  
  return context;
}

// CLI usage
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Context Retriever - OpenClaw Memory System

Usage: node context-retriever.js [options]

Options:
  --all, -a      Show all memory files (not just recent)
  --search, -s   Search memory for a specific term
  --help, -h     Show this help message

Examples:
  node context-retriever.js                    # Show all context
  node context-retriever.js --all              # Include older files
  node context-retriever.js --search "project" # Search for "project"
`);
    process.exit(0);
  }
  
  const showAll = args.includes('--all') || args.includes('-a');
  const searchIndex = args.findIndex(a => a === '--search' || a === '-s');
  const searchQuery = searchIndex > 0 ? args[searchIndex + 1] : null;
  
  displayContext({ showAll, search: searchQuery });
}

module.exports = {
  getAllContext,
  searchMemory,
  displayContext
};
