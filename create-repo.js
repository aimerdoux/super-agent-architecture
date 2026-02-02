const https = require('https');

const GITHUB_TOKEN = 'ghp_4vVNEpF31B84XnBE7CgVYIHY6HYG7cAiLBvCBTqjYx68DKSgrdtoumpiPKIJNYVS3SYfYuyq';
const REPO_NAME = 'super-agent-architecture';
const DESCRIPTION = 'Advanced, self-evolving AI assistant built with OpenClaw';

const createRepoData = JSON.stringify({
  name: REPO_NAME,
  description: DESCRIPTION,
  private: false,
  auto_init: false
});

const createRepoOptions = {
  hostname: 'api.github.com',
  path: '/user/repos',
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'Content-Type': 'application/json',
    'User-Agent': 'Super-Agent-Architecture/1.0',
    'Content-Length': createRepoData.length
  }
};

const createReq = https.request(createRepoOptions, (res) => {
  let data = '';
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const repo = JSON.parse(data);
      console.log('Repository created!');
      console.log('URL:', repo.html_url);
      
      const { execSync } = require('child_process');
      
      console.log('\nAdding remote and pushing...');
      
      try {
        execSync(`git remote add origin ${repo.clone_url}`, { cwd: __dirname });
        console.log('Remote added');
      } catch (e) {
        console.log('Remote already exists, updating URL');
        execSync(`git remote set-url origin ${repo.clone_url}`, { cwd: __dirname });
      }
      
      execSync('git branch -M main', { cwd: __dirname });
      execSync('git push -u origin main', { 
        cwd: __dirname,
        env: { ...process.env, GIT_ASKPASS: 'echo', NODE_TLS_REJECT_UNAUTHORIZED: '0' }
      });
      
      console.log('\nSuccessfully pushed to GitHub!');
      console.log('\nYour Super Agent Architecture repo is live at:');
      console.log(repo.html_url);
      
    } catch (e) {
      console.error('Error:', e.message);
      console.log('Response:', data);
    }
  });
});

createReq.on('error', (e) => {
  console.error('Error creating repository:', e.message);
});

createReq.write(createRepoData);
createReq.end();
