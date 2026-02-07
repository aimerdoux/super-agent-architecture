/**
 * 📋 Jarvis Task Index
 * Available research and automation tasks
 */

const TASKS = {
  /**
   * 🏪 Alibaba → Amazon Arbitrage Research
   * Finds profitable products by comparing Alibaba wholesale prices to Amazon retail
   */
  'arbitrage-research': {
    name: 'Product Arbitrage Research',
    script: 'scripts/tasks/arbitrage-research.js',
    description: 'Scrape Alibaba products, verify on Amazon, calculate margins',
    category: 'research',
    duration: '30-60 minutes',
    requirements: ['Browser Relay', 'Chrome Extension'],
    qualityMetrics: {
      dataCompleteness: 'Required fields: price, MOQ, orders, Amazon match',
      verificationRate: 'Products found on Amazon',
      confidenceScore: 'Weighted quality assessment'
    }
  },

  /**
   * 🔍 Competitor Price Monitoring
   * Track competitor prices over time
   */
  'price-monitor': {
    name: 'Competitor Price Monitor',
    script: 'scripts/tasks/price-monitor.js',
    description: 'Monitor competitor prices and alert on changes',
    category: 'monitoring',
    duration: '15-30 minutes',
    schedule: 'Daily (cron)',
    requirements: ['Browser Relay']
  },

  /**
   * 🎥 YouTube Research
   * Research topics via YouTube video analysis
   */
  'youtube-research': {
    name: 'YouTube Topic Research',
    script: 'scripts/tasks/youtube-research.js',
    description: 'Extract insights from YouTube videos on a topic',
    category: 'research',
    duration: '10-20 minutes',
    requirements: ['Browser Relay', 'Video processing']
  },

  /**
   * 📊 Market Analysis
   * Deep market research on a specific niche
   */
  'market-analysis': {
    name: 'Market Analysis',
    script: 'scripts/tasks/market-analysis.js',
    description: 'Comprehensive market research: trends, competitors, opportunities',
    category: 'research',
    duration: '45-90 minutes',
    requirements: ['Web search', 'Browser Relay']
  },

  /**
   * 🔄 Lead Generation
   * Find and qualify potential leads
   */
  'lead-generation': {
    name: 'Lead Generation',
    script: 'scripts/tasks/lead-generation.js',
    description: 'Find and qualify business leads from web sources',
    category: 'sales',
    duration: '30-60 minutes',
    requirements: ['Browser Relay', 'Data extraction']
  }
};

/**
 * List all available tasks
 */
function listTasks() {
  return Object.entries(TASKS).map(([id, task]) => ({
    id,
    name: task.name,
    category: task.category,
    duration: task.duration,
    description: task.description
  }));
}

/**
 * Get task details
 */
function getTask(taskId) {
  return TASKS[taskId];
}

/**
 * Run a task
 */
async function runTask(taskId, options = {}) {
  const task = TASKS[taskId];
  if (!task) {
    throw new Error(`Task not found: ${taskId}`);
  }

  const { execSync } = require('child_process');
  const path = require('path');

  const scriptPath = path.join(__dirname, '..', task.script);
  
  console.log(`🚀 Starting task: ${task.name}`);
  console.log(`📁 Script: ${scriptPath}`);
  
  execSync(`node "${scriptPath}"`, {
    stdio: 'inherit',
    cwd: path.join(__dirname, '..')
  });
}

module.exports = {
  TASKS,
  listTasks,
  getTask,
  runTask
};

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);

  if (args.includes('--list')) {
    console.log('\n📋 Available Jarvis Tasks:\n');
    const tasks = listTasks();
    console.table(tasks.map(t => ({
      ID: t.id,
      Name: t.name,
      Category: t.category,
      Duration: t.duration,
      Description: t.description
    })));
  }

  if (args.includes('--run')) {
    const taskId = args[args.indexOf('--run') + 1];
    runTask(taskId).catch(err => {
      console.error(`❌ Failed to run task: ${err.message}`);
      process.exit(1);
    });
  }

  if (args.includes('--info')) {
    const taskId = args[args.indexOf('--info') + 1];
    const task = getTask(taskId);
    if (task) {
      console.log(`\n📋 Task: ${task.name}\n`);
      console.log(JSON.stringify(task, null, 2));
    }
  }
}
