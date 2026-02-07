/**
 * Jarvis Cron Job Manager
 * Scheduled tasks for proactive agent behavior
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Configuration
const CRON_CONFIG_FILE = path.join(__dirname, '..', 'state', 'cron-jobs.json');

/**
 * Scheduled Task Definitions
 */
const DEFAULT_JOBS = [
  {
    id: 'memory-sync',
    name: 'Sync memories to cloud',
    schedule: '0 * * * *', // Every hour
    script: 'scripts/memory-sync.js',
    enabled: true,
    description: 'Syncs local memories to Supabase cloud',
    environment: {}
  },
  {
    id: 'heartbeat',
    name: 'Heartbeat health check',
    schedule: '*/30 * * * *', // Every 30 minutes
    script: 'scripts/heartbeat.js',
    enabled: true,
    description: 'Proactive health checks and notifications',
    environment: {}
  },
  {
    id: 'browser-research',
    name: 'Automated research session',
    schedule: '0 9 * * *', // 9 AM daily
    script: 'scripts/long-running-browser.js',
    args: '--research',
    enabled: false,
    description: 'Daily research session for new developments',
    environment: { HEADLESS: 'true' }
  },
  {
    id: 'mcp-tool-update',
    name: 'Check for new MCP tools',
    schedule: '0 12 * * 0', // Noon every Sunday
    script: 'scripts/mcp-tool-builder.js',
    args: '--discover',
    enabled: true,
    description: 'Discovers new MCP tools from GitHub',
    environment: {}
  },
  {
    id: 'context-cleanup',
    name: 'Clean up old context files',
    schedule: '0 3 * * *', // 3 AM daily
    script: 'scripts/cleanup.js',
    enabled: true,
    description: 'Removes temporary context files older than 7 days',
    environment: { MAX_AGE_DAYS: '7' }
  },
  {
    id: 'meta-learning',
    name: 'Run meta-learning analysis',
    schedule: '0 1 * * 1', // 1 AM every Monday
    script: 'scripts/meta-learning.js',
    enabled: true,
    description: 'Analyzes agent performance and suggests improvements',
    environment: {}
  },
  {
    id: 'github-backup',
    name: 'Backup workspace to GitHub',
    schedule: '0 */4 * * *', // Every 4 hours
    script: 'scripts/github-backup.js',
    enabled: true,
    description: 'Commits and pushes changes to GitHub',
    environment: {}
  }
];

/**
 * Cron Job Manager
 */
class CronJobManager {
  constructor() {
    this.jobs = this.loadJobs();
  }

  loadJobs() {
    if (fs.existsSync(CRON_CONFIG_FILE)) {
      const config = JSON.parse(fs.readFileSync(CRON_CONFIG_FILE, 'utf-8'));
      return config.jobs || DEFAULT_JOBS;
    }
    return DEFAULT_JOBS;
  }

  saveJobs() {
    fs.writeFileSync(CRON_CONFIG_FILE, JSON.stringify({
      version: '1.0',
      updatedAt: new Date().toISOString(),
      jobs: this.jobs
    }, null, 2));
  }

  listJobs() {
    return this.jobs.map(job => ({
      id: job.id,
      name: job.name,
      schedule: job.schedule,
      enabled: job.enabled,
      description: job.description
    }));
  }

  getJob(id) {
    return this.jobs.find(job => job.id === id);
  }

  addJob(jobConfig) {
    const job = {
      id: jobConfig.id || `job-${Date.now()}`,
      name: jobConfig.name,
      schedule: jobConfig.schedule,
      script: jobConfig.script,
      args: jobConfig.args || '',
      enabled: jobConfig.enabled !== false,
      description: jobConfig.description || '',
      environment: jobConfig.environment || {},
      createdAt: new Date().toISOString()
    };

    this.jobs.push(job);
    this.saveJobs();
    return job;
  }

  updateJob(id, updates) {
    const index = this.jobs.findIndex(job => job.id === id);
    if (index === -1) {
      throw new Error(`Job not found: ${id}`);
    }

    this.jobs[index] = {
      ...this.jobs[index],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.saveJobs();
    return this.jobs[index];
  }

  deleteJob(id) {
    const index = this.jobs.findIndex(job => job.id === id);
    if (index === -1) {
      throw new Error(`Job not found: ${id}`);
    }

    const deleted = this.jobs.splice(index, 1)[0];
    this.saveJobs();
    return deleted;
  }

  toggleJob(id, enabled) {
    return this.updateJob(id, { enabled });
  }

  async runJob(id) {
    const job = this.getJob(id);
    if (!job) {
      throw new Error(`Job not found: ${id}`);
    }

    console.log(`🚀 Running job: ${job.name}`);
    const startTime = Date.now();

    try {
      // Build command
      const scriptPath = path.join(__dirname, '..', job.script);
      const cmd = `node "${scriptPath}" ${job.args || ''}`;
      
      // Execute
      const output = execSync(cmd, {
        encoding: 'utf-8',
        timeout: 3600000, // 1 hour max
        env: {
          ...process.env,
          ...job.environment
        }
      });

      const duration = Date.now() - startTime;
      console.log(`✅ Job completed in ${(duration / 1000).toFixed(1)}s`);

      // Log success
      this.logJobRun(id, 'success', output);

      return { success: true, output, duration };
    } catch (error) {
      console.error(`❌ Job failed: ${job.name}`);
      console.error(error.message);

      // Log failure
      this.logJobRun(id, 'failed', error.message);

      return { success: false, error: error.message };
    }
  }

  logJobRun(jobId, status, output) {
    const logFile = path.join(__dirname, '..', 'state', 'cron-logs.json');
    let logs = [];

    if (fs.existsSync(logFile)) {
      try {
        logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));
      } catch {}
    }

    logs.unshift({
      jobId,
      status,
      output: output?.substring?.(0, 1000) || '',
      timestamp: new Date().toISOString()
    });

    // Keep last 100 logs
    logs = logs.slice(0, 100);

    fs.writeFileSync(logFile, JSON.stringify(logs, null, 2));
  }

  getLogs(jobId = null, limit = 20) {
    const logFile = path.join(__dirname, '..', 'state', 'cron-logs.json');
    
    if (!fs.existsSync(logFile)) {
      return [];
    }

    let logs = JSON.parse(fs.readFileSync(logFile, 'utf-8'));

    if (jobId) {
      logs = logs.filter(log => log.jobId === jobId);
    }

    return logs.slice(0, limit);
  }

  /**
   * Generate crontab entries for system cron
   */
  generateCrontab() {
    let crontab = '# Jarvis Cron Jobs - Auto-generated\n';
    crontab += '# Do not edit manually - use Jarvis CLI\n\n';

    for (const job of this.jobs) {
      if (!job.enabled) continue;

      crontab += `${job.schedule} cd ${path.join(__dirname, '..')} && node ${job.script} ${job.args || ''} >> ${path.join(__dirname, '..', 'logs', `${job.id}.log`)} 2>&1\n`;
    }

    return crontab;
  }

  /**
   * Install jobs to system crontab
   */
  installToSystem() {
    const crontab = this.generateCrontab();
    const tempFile = path.join(__dirname, '..', 'state', 'jarvis-crontab');

    fs.writeFileSync(tempFile, crontab);

    try {
      execSync(`crontab ${tempFile}`);
      console.log('✅ Cron jobs installed to system');
      return true;
    } catch {
      console.log('⚠️ Could not install to system crontab (requires sudo or manual setup)');
      console.log(`📄 Crontab saved to: ${tempFile}`);
      return false;
    }
  }
}

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  const manager = new CronJobManager();

  if (args.includes('--list')) {
    const jobs = manager.listJobs();
    console.log('\n📅 Jarvis Cron Jobs:\n');
    console.table(jobs);
  }

  if (args.includes('--run')) {
    const jobId = args[args.indexOf('--run') + 1];
    manager.runJob(jobId).then(result => {
      process.exit(result.success ? 0 : 1);
    });
  }

  if (args.includes('--enable')) {
    const jobId = args[args.indexOf('--enable') + 1];
    manager.toggleJob(jobId, true);
    console.log(`✅ Job enabled: ${jobId}`);
  }

  if (args.includes('--disable')) {
    const jobId = args[args.indexOf('--disable') + 1];
    manager.toggleJob(jobId, false);
    console.log(`⏭ Job disabled: ${jobId}`);
  }

  if (args.includes('--add')) {
    const config = {
      name: args[args.indexOf('--name') + 1],
      schedule: args[args.indexOf('--schedule') + 1],
      script: args[args.indexOf('--script') + 1],
      enabled: true
    };
    const job = manager.addJob(config);
    console.log(`✅ Job added: ${job.id}`);
  }

  if (args.includes('--logs')) {
    const jobId = args.find(a => a.startsWith('--job='))?.split('=')[1];
    const logs = manager.getLogs(jobId);
    console.log('\n📜 Job Logs:\n');
    console.table(logs.map(l => ({
      job: l.jobId,
      status: l.status,
      time: l.timestamp,
      output: l.output.substring(0, 50) + '...'
    })));
  }

  if (args.includes('--install')) {
    manager.installToSystem();
  }
}

module.exports = {
  CronJobManager,
  DEFAULT_JOBS
};
