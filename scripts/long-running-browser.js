/**
 * Long-Running Browser Automation
 * Uses Chrome Browser Relay for sustained browsing sessions
 */

const { spawn, exec } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuration
const CONFIG = {
  sessionDir: path.join(__dirname, '..', 'state', 'browser-sessions'),
  maxSessionDuration: 60 * 60 * 1000, // 1 hour
  checkInterval: 10000, // 10 seconds
  screenshotsDir: path.join(__dirname, '..', 'memory', 'browser-screenshots'),
};

/**
 * Browser Session Manager
 */
class BrowserSession {
  constructor(options = {}) {
    this.id = options.id || `session-${Date.now()}`;
    this.url = options.url || 'about:blank';
    this.headless = options.headless || false;
    this.keepAlive = options.keepAlive || false;
    this.actions = options.actions || [];
    this.status = 'idle';
    this.startTime = null;
    this.browser = null;
    this.screenshots = [];
  }

  async start() {
    this.status = 'starting';
    this.startTime = new Date();
    
    // Create session directory
    const sessionPath = path.join(CONFIG.sessionDir, this.id);
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }

    // Launch browser via OpenClaw browser relay
    this.browser = await this.launchBrowser();
    
    this.status = 'running';
    console.log(`🌐 Browser session ${this.id} started`);
    
    // Execute queued actions
    await this.executeActions();
    
    // Keep alive monitoring
    if (this.keepAlive) {
      this.monitor();
    }
    
    return this;
  }

  async launchBrowser() {
    // Using OpenClaw browser relay
    const { browser } = require('./browser-relay');
    return await browser.launch({
      headless: this.headless,
      sessionDir: path.join(CONFIG.sessionDir, this.id),
      persist: true
    });
  }

  async navigate(url) {
    this.url = url;
    await this.browser.navigate(url);
    return this;
  }

  async click(selector) {
    await this.browser.click(selector);
    return this;
  }

  async type(selector, text) {
    await this.browser.type(selector, text);
    return this;
  }

  async scroll(direction) {
    await this.browser.scroll(direction);
    return this;
  }

  async extract(selector, type = 'text') {
    return await this.browser.extract(selector, type);
  }

  async waitForSelector(selector, timeout = 10000) {
    await this.browser.waitForSelector(selector, timeout);
    return this;
  }

  async takeScreenshot(name = null) {
    const filename = name || `screenshot-${Date.now()}.png`;
    const filepath = path.join(CONFIG.screenshotsDir, filename);
    
    await this.browser.screenshot(filepath);
    this.screenshots.push(filepath);
    
    return filepath;
  }

  async executeActions() {
    for (const action of this.actions) {
      if (this.status !== 'running') break;
      
      console.log(`⚡ Executing: ${action.type}`);
      
      switch (action.type) {
        case 'navigate':
          await this.navigate(action.url);
          break;
        case 'click':
          await this.click(action.selector);
          break;
        case 'type':
          await this.type(action.selector, action.text);
          break;
        case 'scroll':
          await this.scroll(action.direction || 'down');
          break;
        case 'wait':
          await new Promise(r => setTimeout(r, action.duration || 2000));
          break;
        case 'screenshot':
          await this.takeScreenshot(action.name);
          break;
        case 'extract':
          const result = await this.extract(action.selector, action.format);
          console.log(`📄 Extracted: ${result.substring(0, 100)}...`);
          break;
        case 'waitForSelector':
          await this.waitForSelector(action.selector, action.timeout);
          break;
      }
      
      // Delay between actions
      if (action.delay) {
        await new Promise(r => setTimeout(r, action.delay));
      }
    }
  }

  monitor() {
    const interval = setInterval(() => {
      if (this.status !== 'running') {
        clearInterval(interval);
        return;
      }

      const elapsed = Date.now() - this.startTime.getTime();
      
      if (elapsed > CONFIG.maxSessionDuration) {
        console.log(`⏰ Session ${this.id} exceeded max duration, refreshing...`);
        this.refresh();
      }
    }, CONFIG.checkInterval);
  }

  async refresh() {
    await this.browser.close();
    this.browser = await this.launchBrowser();
    this.startTime = new Date();
  }

  async close() {
    this.status = 'closing';
    if (this.browser) {
      await this.browser.close();
    }
    this.status = 'closed';
    console.log(`🔒 Browser session ${this.id} closed`);
  }

  toJSON() {
    return {
      id: this.id,
      url: this.url,
      status: this.status,
      startTime: this.startTime,
      screenshots: this.screenshots.length,
      actionsExecuted: this.actions.length
    };
  }
}

/**
 * Scheduled Browser Task
 */
class ScheduledBrowserTask {
  constructor(config) {
    this.name = config.name;
    this.schedule = config.schedule; // cron expression
    this.browserConfig = config.browser;
    this.actions = config.actions;
    this.enabled = config.enabled !== false;
  }

  async run() {
    if (!this.enabled) {
      console.log(`⏭ Skipping disabled task: ${this.name}`);
      return;
    }

    console.log(`🚀 Running scheduled task: ${this.name}`);
    
    const session = new BrowserSession({
      ...this.browserConfig,
      actions: this.actions,
      keepAlive: true
    });

    await session.start();
    await session.close();
    
    console.log(`✅ Task completed: ${this.name}`);
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  // Example: Start a long-running research session
  if (args.includes('--research')) {
    const session = new BrowserSession({
      url: 'https://news.ycombinator.com',
      headless: false,
      keepAlive: true,
      actions: [
        { type: 'wait', duration: 3000 },
        { type: 'scroll', direction: 'down' },
        { type: 'wait', duration: 2000 },
        { type: 'scroll', direction: 'down' },
        { type: 'screenshot', name: 'hn-research.png' }
      ]
    });

    session.start().catch(err => {
      console.error('Session error:', err);
      process.exit(1);
    });

    // Handle graceful shutdown
    process.on('SIGINT', async () => {
      await session.close();
      process.exit(0);
    });
  }
  
  // Run a single task
  if (args.includes('--run-task')) {
    const taskName = args[args.indexOf('--run-task') + 1];
    // Load and run task from config
  }
}

module.exports = {
  BrowserSession,
  ScheduledBrowserTask
};
