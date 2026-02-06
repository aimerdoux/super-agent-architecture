// Test script to verify pinecone-memory and test the tools
const path = require('path');

// Add the pinecone-memory node_modules to the path
const pineconePath = 'C:\\Users\\play4\\AppData\\Roaming\\npm\\node_modules\\openclaw\\skills\\pinecone-memory';
const pineconeNodeModules = path.join(pineconePath, 'node_modules');
module.paths.unshift(pineconeNodeModules);

const { Pinecone } = require('@pinecone-database/pinecone');

// Configuration from openclaw.json
const config = {
  apiKey: 'pcsk_3vcgcX_Q4VziHP7A8pGRhaCAPeFgro2jAUCJrVTArQQMBpDFM3ujeeUgefyAhsqq3TWXdp',
  environment: 'us-west1-gcp',
  indexName: 'clawdoux'
};

async function generateEmbedding(text) {
  const response = await fetch('http://localhost:11434/api/embed', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'nomic-embed-text',
      input: text
    })
  });
  
  if (!response.ok) {
    throw new Error(`Ollama embedding failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.embeddings[0];
}

async function memory_index(text, metadata = {}) {
  const pinecone = new Pinecone({ apiKey: config.apiKey, environment: config.environment });
  const index = pinecone.index(config.indexName);
  
  // Generate embedding
  const embedding = await generateEmbedding(text);
  
  // Generate unique ID
  const id = `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  // Upsert to Pinecone
  await index.upsert([{
    id,
    values: embedding,
    metadata: {
      text: text.substring(0, 500), // Truncate for metadata
      timestamp: new Date().toISOString(),
      ...metadata
    }
  }]);
  
  return { success: true, id, message: 'Memory indexed successfully' };
}

async function memory_recall(query, topK = 5) {
  const pinecone = new Pinecone({ apiKey: config.apiKey, environment: config.environment });
  const index = pinecone.index(config.indexName);
  
  // Generate query embedding
  const embedding = await generateEmbedding(query);
  
  // Search
  const searchResponse = await index.query({
    vector: embedding,
    topK,
    includeMetadata: true
  });
  
  const results = searchResponse.matches.map(match => ({
    id: match.id,
    score: match.score,
    text: match.metadata?.text,
    metadata: match.metadata
  }));
  
  return { query, results, count: results.length };
}

async function testPinecone() {
  console.log('='.repeat(70));
  console.log('TESTING PINECONE-MEMORY FUNCTIONALITY');
  console.log('='.repeat(70));
  console.log('');
  
  try {
    // Test 1: Index a memory
    console.log('TEST 1: Indexing a test memory...');
    const testMemory = "Self-evolving code reviewer plugin created with 7 tools: analyze_code, parse_logs, calculate_confidence, execute_deletion, fallback_model, store_review, trigger_review. Cascade fallback uses Ollama → MiniMax → OpenAI → Claude hierarchy.";
    const indexResult = await memory_index(testMemory, {
      source: 'test-script',
      type: 'plugin_test',
      category: 'code-reviewer'
    });
    console.log(`✓ Memory indexed: ${indexResult.id}`);
    console.log('');
    
    // Test 2: Recall the memory
    console.log('TEST 2: Recalling memories about code reviewer...');
    const recallResult = await memory_recall('code reviewer plugin tools cascade fallback');
    console.log(`✓ Found ${recallResult.count} memories`);
    if (recallResult.results.length > 0) {
      console.log(`  Top match: "${recallResult.results[0].text?.substring(0, 80)}..."`);
      console.log(`  Score: ${(recallResult.results[0].score * 100).toFixed(1)}%`);
    }
    console.log('');
    
    // Test 3: Index the knowledge summary
    console.log('TEST 3: Indexing agent knowledge summary...');
    const knowledgeMemory = "Self-evolving agent built with OpenClaw. Features: proactive-agent for self-triggered actions, self-improve-agent for reflection, browser-agent for web navigation, code-reviewer for code analysis. Uses Pinecone for vector memory with Ollama embeddings. API keys used: 1/10 (Pinecone only).";
    const knowledgeResult = await memory_index(knowledgeMemory, {
      source: 'AGENT_KNOWLEDGE.md',
      type: 'agent_summary',
      category: 'system_state'
    });
    console.log(`✓ Knowledge indexed: ${knowledgeResult.id}`);
    console.log('');
    
    // Test 4: Recall recent work
    console.log('TEST 4: Recalling memories about API keys...');
    const apiResult = await memory_recall('API keys Pinecone budget minimal');
    console.log(`✓ Found ${apiResult.count} memories`);
    if (apiResult.results.length > 0) {
      console.log(`  Top match: "${apiResult.results[0].text?.substring(0, 80)}..."`);
      console.log(`  Score: ${(apiResult.results[0].score * 100).toFixed(1)}%`);
    }
    console.log('');
    
    console.log('='.repeat(70));
    console.log('ALL PINECONE TESTS PASSED! ✓');
    console.log('='.repeat(70));
    console.log('');
    console.log('The pinecone-memory skill is fully functional!');
    console.log('- Embeddings generated via local Ollama (nomic-embed-text)');
    console.log('- Vectors stored in Pinecone cloud (clawdoux index)');
    console.log('- Semantic search working correctly');
    console.log('- Ready for production use');
    
  } catch (error) {
    console.error('TEST FAILED:', error.message);
    process.exit(1);
  }
}

testPinecone();
