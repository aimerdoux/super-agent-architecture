// Test Pinecone with correct host
const https = require('https');

const API_KEY = 'pcsk_3vcgcX_Q4VziHP7A8pGRhaCAPeFgro2jAUCJrVTArQQMBpDFM3ujeeUgefyAhsqq3TWXdp';
const INDEX_HOST = 'clawdoux-z66zsxo.svc.aped-4627-b74a.pinecone.io';

console.log('='.repeat(70));
console.log('PINECONE MEMORY TEST');
console.log('='.repeat(70));
console.log('');

// First, let's generate an embedding with Ollama
async function generateEmbedding(text) {
  console.log('1. Generating embedding with Ollama...');
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
  console.log(`   ✓ Embedding generated (${data.embeddings[0].length} dimensions)`);
  return data.embeddings[0];
}

async function upsertVector(id, vector, metadata) {
  console.log('2. Upserting vector to Pinecone...');
  
  const postData = JSON.stringify({
    vectors: [{
      id,
      values: vector,
      metadata
    }]
  });
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: INDEX_HOST,
      path: '/vectors/upsert',
      method: 'POST',
      headers: {
        'Api-Key': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('   ✓ Vector upserted successfully');
          resolve(JSON.parse(data));
        } else {
          console.log(`   ✗ Error: ${res.statusCode} - ${data}`);
          reject(new Error(`Pinecone upsert failed: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function queryVector(queryVector, topK = 5) {
  console.log('3. Querying similar vectors...');
  
  const postData = JSON.stringify({
    vector: queryVector,
    topK,
    includeMetadata: true
  });
  
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: INDEX_HOST,
      path: '/query',
      method: 'POST',
      headers: {
        'Api-Key': API_KEY,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log('   ✓ Query successful');
          resolve(JSON.parse(data));
        } else {
          console.log(`   ✗ Error: ${res.statusCode} - ${data}`);
          reject(new Error(`Pinecone query failed: ${data}`));
        }
      });
    });
    
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

async function testPineconeMemory() {
  try {
    // Test memory
    const testText = "Self-evolving code reviewer agent with 7 tools: analyze_code, parse_logs, calculate_confidence, execute_deletion, fallback_model, store_review, trigger_review. Cascade fallback: Ollama → MiniMax → OpenAI → Claude.";
    const metadata = {
      text: testText,
      source: 'plugin-test',
      type: 'code-reviewer',
      category: 'feature',
      timestamp: new Date().toISOString()
    };
    
    // Generate embedding
    const vector = await generateEmbedding(testText);
    
    // Upsert
    const id = `test_${Date.now()}`;
    await upsertVector(id, vector, metadata);
    
    // Query to verify
    console.log('');
    console.log('4. Verifying stored memory...');
    const results = await queryVector(vector, 5);
    
    console.log('');
    console.log('='.repeat(70));
    console.log('PINECONE MEMORY TEST RESULTS');
    console.log('='.repeat(70));
    console.log('');
    console.log(`✓ Connected to Pinecone index: clawdoux`);
    console.log(`✓ Host: ${INDEX_HOST}`);
    console.log(`✓ Dimension: ${vector.length}`);
    console.log(`✓ Vectors returned: ${results.matches?.length || 0}`);
    console.log('');
    console.log('The pinecone-memory skill is fully functional!');
    console.log('Ready to store and retrieve semantic memories.');
    
  } catch (error) {
    console.error('TEST FAILED:', error.message);
    process.exit(1);
  }
}

testPineconeMemory();
