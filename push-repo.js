const { execSync } = require('child_process');
const path = require('path');

const repoDir = 'C:\\Users\\play4\\.openclaw\\workspace\\super-agent-architecture';
const ghPath = 'C:\\Program Files\\GitHub CLI\\gh.exe';

// Uses gh auth token from GitHub CLI (already authenticated via `gh auth login`)
console.log('Creating GitHub repository...\n');

try {
  console.log('Creating repository...');
  execSync(`"${ghPath}" repo create super-agent-architecture --public --description "Advanced, self-evolving AI assistant built with OpenClaw" --source="${repoDir}"`, {
    cwd: repoDir,
    stdio: 'inherit'
  });

  console.log('\nRepository created successfully!');
  console.log('\nYour repository is live at:');
  console.log('   https://github.com/aimerdoux/super-agent-architecture');

} catch (error) {
  console.error('Error:', error.message);
  console.log('\nManual steps:');
  console.log('1. Go to https://github.com/new');
  console.log('2. Create repository "super-agent-architecture"');
  console.log('3. Run: git remote add origin https://github.com/aimerdoux/super-agent-architecture.git');
  console.log('4. Run: git push -u origin main');
}
