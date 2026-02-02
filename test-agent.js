const https = require('https');

if (!process.env.SUPABASE_URL) {
  console.error('Error: SUPABASE_URL environment variable is required.');
  process.exit(1);
}
const FUNCTION_URL = `${process.env.SUPABASE_URL}/functions/v1/agent-core`;

const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!SERVICE_KEY) {
  console.error('Error: SUPABASE_SERVICE_KEY environment variable is required.');
  console.error('Set it via: set SUPABASE_SERVICE_KEY=your-key (Windows) or export SUPABASE_SERVICE_KEY=your-key (Unix)');
  process.exit(1);
}

const url = new URL(FUNCTION_URL);
const actions = ['status', 'memory'];

actions.forEach(action => {
  const data = JSON.stringify({ action });

  const options = {
    hostname: url.hostname,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SERVICE_KEY}`,
      'Content-Length': Buffer.byteLength(data)
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
      console.log(`\n${'='.repeat(50)}`);
      console.log(`Action: ${action}`);
      console.log(`Status: ${res.statusCode}`);
      try {
        console.log(`Response: ${JSON.stringify(JSON.parse(body), null, 2)}`);
      } catch {
        console.log(`Response: ${body}`);
      }
    });
  });

  req.on('error', (e) => console.error('Error:', e.message));
  req.write(data);
  req.end();
});
