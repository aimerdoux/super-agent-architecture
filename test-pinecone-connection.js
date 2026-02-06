// Test Pinecone connection directly
const https = require('https');

const API_KEY = 'pcsk_3vcgcX_Q4VziHP7A8pGRhaCAPeFgro2jAUCJrVTArQQMBpDFM3ujeeUgefyAhsqq3TWXdp';

console.log('='.repeat(70));
console.log('PINECONE CONNECTION TEST');
console.log('='.repeat(70));
console.log('');

// Test 1: List indexes
console.log('TEST 1: Listing Pinecone indexes...');
const listReq = https.request({
  hostname: 'api.pinecone.io',
  path: '/indexes',
  method: 'GET',
  headers: {
    'Api-Key': API_KEY,
    'Content-Type': 'application/json'
  }
}, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    console.log(`Status: ${res.statusCode}`);
    try {
      const parsed = JSON.parse(data);
      console.log('Indexes:', JSON.stringify(parsed, null, 2));
    } catch (e) {
      console.log('Response:', data);
    }
    
    // Test 2: Describe index
    console.log('');
    console.log('TEST 2: Describing clawdoux index...');
    const describeReq = https.request({
      hostname: 'api.pinecone.io',
      path: '/indexes/clawdoux',
      method: 'GET',
      headers: {
        'Api-Key': API_KEY,
        'Content-Type': 'application/json'
      }
    }, (res2) => {
      let data2 = '';
      res2.on('data', chunk => data2 += chunk);
      res2.on('end', () => {
        console.log(`Status: ${res2.statusCode}`);
        try {
          const parsed2 = JSON.parse(data2);
          console.log('Index details:', JSON.stringify(parsed2, null, 2));
        } catch (e) {
          console.log('Response:', data2);
        }
      });
    });
    describeReq.on('error', e => console.error('Error:', e.message));
    describeReq.end();
  });
});

listReq.on('error', e => console.error('Error:', e.message));
listReq.end();
