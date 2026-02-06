/**
 * Memory Sync System
 * Syncs local markdown memories to Supabase cloud vector store
 */

require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const { execSync } = require('child_process');

// Configuration
const LOCAL_MEMORY_DIR = path.join(__dirname, '..', 'memory');
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

/**
 * Generate embedding using local Ollama (nomic-embed-text)
 */
async function generateEmbedding(text) {
  try {
    const response = await fetch('http://localhost:11434/api/embed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'nomic-embed-text',
        input: text
      })
    });
    
    const data = await response.json();
    return data.embedding || data.embeddings?.[0];
  } catch (error) {
    console.error('Ollama embedding error:', error.message);
    // Fallback: return null to skip embedding
    return null;
  }
}

/**
 * Extract plain text from markdown
 */
function extractTextFromMarkdown(content) {
  // Remove frontmatter
  let text = content.replace(/^---\n[\s\S]*?\n---\n/, '');
  // Remove headers
  text = text.replace(/^#{1,6}\s+.+$/gm, '');
  // Remove code blocks
  text = text.replace(/```[\s\S]*?```/g, '');
  // Remove inline code
  text = text.replace(/`[^`]+`/g, '');
  // Remove links but keep text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');
  // Clean up whitespace
  text = text.replace(/\n{3,}/g, '\n\n').trim();
  return text;
}

/**
 * Get all markdown files from memory directory
 */
function getLocalMemories() {
  const memories = [];
  
  if (!fs.existsSync(LOCAL_MEMORY_DIR)) {
    console.log('Memory directory not found:', LOCAL_MEMORY_DIR);
    return memories;
  }
  
  const files = fs.readdirSync(LOCAL_MEMORY_DIR);
  
  for (const file of files) {
    if (!file.endsWith('.md')) continue;
    
    const filePath = path.join(LOCAL_MEMORY_DIR, file);
    const content = fs.readFileSync(filePath, 'utf-8');
    const stat = fs.statSync(filePath);
    
    // Extract date from filename or frontmatter
    const dateMatch = file.match(/(\d{4}-\d{2}-\d{2})/);
    const date = dateMatch ? dateMatch[1] : stat.mtime.toISOString().split('T')[0];
    
    memories.push({
      id: file.replace('.md', ''),
      filename: file,
      content: content,
      text: extractTextFromMarkdown(content),
      date: date,
      filePath: filePath,
      mtime: stat.mtime
    });
  }
  
  return memories;
}

/**
 * Check if memory already exists in Supabase
 */
async function checkExistingMemory(memoryId) {
  const { data, error } = await supabase
    .from('memory_embeddings')
    .select('id, created_at')
    .eq('id', memoryId)
    .single();
  
  if (error && error.code !== 'PGRST116') {
    console.error('Error checking existing memory:', error);
  }
  
  return data;
}

/**
 * Insert or update memory in Supabase
 */
async function syncMemory(memory) {
  const embedding = await generateEmbedding(memory.text);
  
  if (!embedding) {
    console.log(`⚠️  Skipping embedding for: ${memory.filename}`);
    return { success: false, reason: 'No embedding generated' };
  }
  
  const existing = await checkExistingMemory(memory.id);
  
  const memoryData = {
    id: memory.id,
    content: memory.text,
    embedding: embedding,
    metadata: {
      filename: memory.filename,
      date: memory.date,
      filePath: memory.filePath,
      syncedAt: new Date().toISOString(),
      localMtime: memory.mtime.toISOString()
    }
  };
  
  let result;
  
  if (existing) {
    // Update existing
    const { data, error } = await supabase
      .from('memory_embeddings')
      .update(memoryData)
      .eq('id', memory.id)
      .select();
    
    if (error) {
      result = { success: false, error: error.message };
    } else {
      result = { success: true, action: 'updated', id: memory.id };
    }
  } else {
    // Insert new
    const { data, error } = await supabase
      .from('memory_embeddings')
      .insert(memoryData)
      .select();
    
    if (error) {
      result = { success: false, error: error.message };
    } else {
      result = { success: true, action: 'inserted', id: memory.id };
    }
  }
  
  return result;
}

/**
 * Main sync function
 */
async function syncMemories(options = {}) {
  const { force = false, limit = null } = options;
  
  console.log('🔄 Starting memory sync to Supabase...\n');
  
  // Check Supabase connection
  const { data: connTest, error: connError } = await supabase
    .from('memory_embeddings')
    .select('count')
    .single();
  
  if (connError && connError.code !== 'PGRST116') {
    console.error('❌ Supabase connection failed:', connError.message);
    process.exit(1);
  }
  
  console.log('✅ Connected to Supabase');
  
  // Get local memories
  const localMemories = getLocalMemories();
  console.log(`📁 Found ${localMemories.length} local memory files\n`);
  
  // Sync each memory
  let synced = 0;
  let skipped = 0;
  let failed = 0;
  
  for (const memory of localMemories) {
    if (limit && synced + skipped + failed >= limit) break;
    
    process.stdout.write(`  Syncing: ${memory.filename}... `);
    
    const existing = await checkExistingMemory(memory.id);
    
    // Skip if not force and mtime hasn't changed
    if (existing && !force) {
      const localMtime = new Date(memory.mtime).getTime();
      const cloudMtime = new Date(existing.created_at).getTime();
      
      if (localMtime <= cloudMtime) {
        console.log('⏭ Skipped (unchanged)');
        skipped++;
        continue;
      }
    }
    
    const result = await syncMemory(memory);
    
    if (result.success) {
      console.log(`✅ ${result.action}`);
      synced++;
    } else {
      console.log(`❌ ${result.error || result.reason}`);
      failed++;
    }
  }
  
  console.log(`\n📊 Sync Complete:`);
  console.log(`   Synced: ${synced}`);
  console.log(`   Skipped: ${skipped}`);
  console.log(`   Failed: ${failed}`);
  
  // Get cloud stats
  const { count } = await supabase
    .from('memory_embeddings')
    .select('*', { count: 'exact', head: true });
  
  console.log(`   Total in cloud: ${count}\n`);
  
  return { synced, skipped, failed, totalCloud: count };
}

/**
 * Search memories in Supabase
 */
async function searchMemories(query, options = {}) {
  const { limit = 5 } = options;
  
  const embedding = await generateEmbedding(query);
  
  if (!embedding) {
    console.error('Failed to generate embedding for query');
    return [];
  }
  
  // Using match_memories function
  const { data, error } = await supabase
    .rpc('match_memories', {
      query_embedding: embedding,
      match_threshold: 0.7,
      match_count: limit
    });
  
  if (error) {
    console.error('Search error:', error);
    return [];
  }
  
  return data || [];
}

// Export for use as module
module.exports = {
  syncMemories,
  syncMemory,
  searchMemories,
  generateEmbedding,
  getLocalMemories
};

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const force = args.includes('--force');
  const search = args.find(a => a.startsWith('--search='));
  const limit = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1]) || null;
  
  if (search) {
    // Search mode
    const query = search.split('=')[1];
    console.log(`🔍 Searching memories: "${query}"`);
    searchMemories(query, { limit: 10 }).then(results => {
      console.log(`\nFound ${results.length} results:\n`);
      results.forEach((r, i) => {
        console.log(`${i + 1}. [${(r.similarity * 100).toFixed(1)}%] ${r.content.substring(0, 100)}...`);
      });
    });
  } else {
    // Sync mode
    syncMemories({ force, limit }).catch(err => {
      console.error('Sync failed:', err);
      process.exit(1);
    });
  }
}
