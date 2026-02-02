const { execSync } = require('child_process');
const path = require('path');

const repoDir = 'C:\\Users\\play4\\.openclaw\\workspace\\super-agent-architecture';
const ghPath = 'C:\\Program Files\\GitHub CLI\\gh.exe';
const token = 'ghp_4vVNEpF31B84XnBE7CgVYIHY6HYG7cAiLBvCBTqjYx68DKSgrdtoumpiPKIJNYVS3SYfYuyq';

console.log('🚀 Creating GitHub repository...\n');

// Set environment variable for GitHub CLI
process.env.GH_TOKEN = token;

try {
  // Create repository
  console.log('📦 Creating repository...');
  execSync(`"${ghPath}" repo create super-agent-architecture --public --description "Advanced, self-evolving AI assistant built with OpenClaw" --source="${repoDir}"`, {
    cwd: repoDir,
    stdio: 'inherit'
  });
  
  console.log('\n✅ Repository created successfully!');
  console.log('\n🌐 Your repository is live at:');
  console.log('   https://github.com/play4/super-agent-architecture');
  
} catch (error) {
  console.error('❌ Error:', error.message);
  console.log('\n📝 Manual steps:');
  console.log('1. Go to https://github.com/new');
  console.log('2. Create repository "super-agent-architecture"');
  console.log('3. Run: git remote add origin https://github.com/play4/super-agent-architecture.git');
  console.log('4. Run: git push -u origin main');
}
