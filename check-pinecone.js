// Check if we can create a new index with correct dimension
const https = require('https');

const API_KEY = 'pcsk_3vcgcX_Q4VziHP7A8pGRhaCAPeFgro2jAUCJrVTArQQMBpDFM3ujeeUgefyAhsqq3TWXdp';

console.log('='.repeat(70));
console.log('PINECONE INDEX CONFIGURATION');
console.log('='.repeat(70));
console.log('');

console.log('Current Issue:');
console.log('- Index: clawdoux');
console.log('- Index dimension: 1024');
console.log('- Ollama model: nomic-embed-text');
console.log('- Embedding dimension: 768');
console.log('- Mismatch: 768 != 1024');
console.log('');

console.log('Options:');
console.log('1. Delete and recreate clawdoux index with dimension 768');
console.log('2. Use a different embedding model with 1024 dimensions');
console.log('3. Pad embeddings to 1024 dimensions (not recommended)');
console.log('');

console.log('Recommended: Option 1 - Recreate index with correct dimension');
console.log('');

console.log('To fix this, you can:');
console.log('');
console.log('1. Go to https://app.pinecone.io');
console.log('2. Delete the "clawdoux" index');
console.log('3. Create a new index with:');
console.log('   - Name: clawdoux');
console.log('   - Dimension: 768');
console.log('   - Metric: cosine');
console.log('   - Region: us-east-1 (or your preferred)');
console.log('');
console.log('Or run: curl -X DELETE "https://api.pinecone.io/indexes/clawdoux" -H "Api-Key: YOUR_KEY"');
console.log('');

// Check index stats
console.log('Current indexes:');
const listReq = https.request({
  hostname: 'api.pinecone.io',
  path: '/indexes',
  method: 'GET',
  headers: { 'Api-Key': API_KEY, 'Content-Type': 'application/json' }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const parsed = JSON.parse(data);
    parsed.indexes?.forEach(idx => {
      console.log(`  - ${idx.name}: ${idx.dimension}d (${idx.status?.state})`);
    });
    
    console.log('');
    console.log('='.repeat(70));
  });
});

listReq.on('error', e => console.error('Error:', e.message));
listReq.end();
