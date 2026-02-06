/**
 * Sandbox Testing Framework
 * 
 * Enables safe testing without risking production state or killing PIDs.
 * 
 * Modes:
 * - dry-run: Simulate everything, log actions
 * - mock: Use mocked responses
 * - limited: Execute with strict resource caps
 * - production: Real execution (opt-in)
 */

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

// Configuration
const CONFIG = {
  defaultMode: 'dry-run',
  resultDir: path.join(__dirname, 'memory', 'sandbox-results'),
  maxExecutionTime: 30000, // 30 seconds default timeout
  memoryLimitMB: 256,
  pidCheckInterval: 1000,
};

/**
 * Sandbox Testing Framework Class
 */
class SandboxTester {
  constructor(options = {}) {
    this.mode = options.mode || CONFIG.defaultMode;
    this.executionLog = [];
    this.processRegistry = new Map();
    this.fileSnapshots = new Map();
    this.testResults = [];
    this.startTime = Date.now();
    
    // Ensure result directory exists
    this.ensureResultDir();
    
    console.log(`[Sandbox] Initialized in ${this.mode} mode`);
  }

  ensureResultDir() {
    if (!fs.existsSync(CONFIG.resultDir)) {
      fs.mkdirSync(CONFIG.resultDir, { recursive: true });
    }
  }

  /**
   * Execute a command in the sandbox
   */
  async execute(command, args = [], options = {}) {
    const executionId = this.generateId();
    const startTime = Date.now();
    
    const execContext = {
      id: executionId,
      command,
      args,
      mode: this.mode,
      options,
      startTime,
      status: 'pending',
      output: null,
      error: null,
    };

    this.executionLog.push(execContext);
    console.log(`[Sandbox:${this.mode}] ${command} ${args.join(' ')}`);

    switch (this.mode) {
      case 'dry-run':
        return this.simulateExecution(execContext);
      case 'mock':
        return this.mockExecution(execContext);
      case 'limited':
        return this.limitedExecution(execContext);
      case 'production':
        return this.realExecution(execContext);
      default:
        throw new Error(`Unknown sandbox mode: ${this.mode}`);
    }
  }

  /**
   * Simulate execution without running anything
   */
  simulateExecution(context) {
    context.status = 'simulated';
    context.output = `[SIMULATED] ${context.command} ${context.args.join(' ')}`;
    context.duration = Date.now() - context.startTime;
    
    return {
      simulated: true,
      ...context,
      message: 'Dry-run mode - no actual execution',
    };
  }

  /**
   * Mock execution with predefined responses
   */
  mockExecution(context) {
    // Generate mock responses based on command patterns
    const mockResponses = {
      'node': { stdout: '[Mock] Node.js execution simulated', stderr: '', code: 0 },
      'npm': { stdout: '[Mock] npm command simulated', stderr: '', code: 0 },
      'git': { stdout: '[Mock] git command simulated', stderr: '', code: 0 },
      'echo': { stdout: context.args.join(' ') || 'Hello from mock!', stderr: '', code: 0 },
      'pwd': { stdout: process.cwd(), stderr: '', code: 0 },
      'ls': { stdout: 'file1.js\nfile2.md\npackage.json', stderr: '', code: 0 },
    };

    const cmd = context.command.toLowerCase();
    const response = mockResponses[cmd] || { 
      stdout: `[Mock] ${context.command} executed`, 
      stderr: '', 
      code: 0 
    };

    context.status = 'mocked';
    context.output = response.stdout;
    context.error = response.stderr;
    context.exitCode = response.code;
    context.duration = Date.now() - context.startTime;

    return {
      mocked: true,
      ...context,
      message: 'Mock response returned',
    };
  }

  /**
   * Limited execution with resource caps
   */
  async limitedExecution(context) {
    return new Promise((resolve) => {
      const timeout = context.options.timeout || CONFIG.maxExecutionTime;
      
      // For simulation, just return a limited response
      context.status = 'limited';
      context.output = `[LIMITED] Resource-constrained execution of: ${context.command}`;
      context.limits = {
        timeout,
        memoryMB: CONFIG.memoryLimitMB,
        mode: 'limited',
      };
      context.duration = Date.now() - context.startTime;
      
      resolve({
        limited: true,
        ...context,
        message: 'Limited execution mode - real command not run',
      });
    });
  }

  /**
   * Real execution (production mode)
   */
  async realExecution(context) {
    return new Promise((resolve) => {
      let timedOut = false;
      const timeout = context.options.timeout || CONFIG.maxExecutionTime;
      
      const child = spawn(context.command, context.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        cwd: context.options.cwd || process.cwd(),
        env: { ...process.env, ...context.options.env },
      });

      // Track process
      const pidInfo = {
        pid: child.pid,
        startTime: Date.now(),
        status: 'running',
      };
      this.processRegistry.set(child.pid, pidInfo);

      let stdout = '';
      let stderr = '';

      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      // Timeout handler
      const timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        pidInfo.status = 'timed_out';
      }, timeout);

      // Completion handler
      child.on('close', (code) => {
        clearTimeout(timeoutId);
        pidInfo.status = 'completed';
        pidInfo.exitCode = code;
        pidInfo.duration = Date.now() - pidInfo.startTime;
        
        context.status = code === 0 ? 'success' : 'failed';
        context.output = stdout;
        context.error = stderr;
        context.exitCode = code;
        context.duration = Date.now() - context.startTime;
        context.pid = child.pid;

        resolve({
          ...context,
          message: timedOut ? 'Execution timed out' : 'Execution completed',
        });
      });

      child.on('error', (err) => {
        clearTimeout(timeoutId);
        context.status = 'error';
        context.error = err.message;
        context.duration = Date.now() - context.startTime;
        resolve({ ...context });
      });
    });
  }

  /**
   * Take a snapshot of file state
   */
  snapshotFile(filePath, label = 'before') {
    try {
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        this.fileSnapshots.set(`${filePath}:${label}`, {
          path: filePath,
          label,
          content,
          timestamp: Date.now(),
        });
        console.log(`[Sandbox] Snapshot taken: ${filePath} (${label})`);
        return true;
      }
    } catch (err) {
      console.error(`[Sandbox] Snapshot failed: ${err.message}`);
    }
    return false;
  }

  /**
   * Compare file snapshots for rollback
   */
  compareSnapshots(filePath) {
    const before = this.fileSnapshots.get(`${filePath}:before`);
    const after = this.fileSnapshots.get(`${filePath}:after`);
    
    if (!before || !after) {
      return { changed: false, reason: 'Missing snapshots' };
    }

    return {
      changed: before.content !== after.content,
      path: filePath,
      beforeHash: this.hashContent(before.content),
      afterHash: this.hashContent(after.content),
    };
  }

  /**
   * Rollback file changes
   */
  rollbackFile(filePath) {
    const before = this.fileSnapshots.get(`${filePath}:before`);
    if (before) {
      fs.writeFileSync(filePath, before.content);
      console.log(`[Sandbox] Rolled back: ${filePath}`);
      return true;
    }
    return false;
  }

  /**
   * Test a new agent in isolation
   */
  async testAgent(agentScript, testInputs = []) {
    console.log(`[Sandbox] Testing agent: ${agentScript}`);
    
    // Snapshot current state
    this.snapshotFile(agentScript, 'before');
    
    const results = {
      agent: agentScript,
      mode: this.mode,
      tests: [],
      timestamp: new Date().toISOString(),
    };

    for (const input of testInputs) {
      const testResult = await this.execute('node', [agentScript], {
        env: { TEST_INPUT: input, SANDBOX_MODE: this.mode },
      });
      results.tests.push({
        input,
        result: testResult,
      });
    }

    // Snapshot after state
    this.snapshotFile(agentScript, 'after');
    results.fileChanges = this.compareSnapshots(agentScript);
    
    this.testResults.push(results);
    return results;
  }

  /**
   * Generate detailed test report
   */
  generateReport(testName = 'sandbox-test') {
    const report = {
      testName,
      mode: this.mode,
      generatedAt: new Date().toISOString(),
      duration: Date.now() - this.startTime,
      executions: this.executionLog,
      processes: Array.from(this.processRegistry.values()),
      fileSnapshots: Array.from(this.fileSnapshots.entries()).map(([key, value]) => ({
        ...value,
        key,
      })),
      testResults: this.testResults,
      summary: {
        totalExecutions: this.executionLog.length,
        simulated: this.executionLog.filter(e => e.status === 'simulated').length,
        mocked: this.executionLog.filter(e => e.status === 'mocked').length,
        limited: this.executionLog.filter(e => e.status === 'limited').length,
        real: this.executionLog.filter(e => e.status === 'success' || e.status === 'failed').length,
        errors: this.executionLog.filter(e => e.status === 'error').length,
      },
    };

    // Save report
    const reportPath = path.join(CONFIG.resultDir, `${testName}-${Date.now()}.json`);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`[Sandbox] Report saved: ${reportPath}`);

    return report;
  }

  /**
   * Clean up all tracked processes
   */
  cleanup() {
    for (const [pid, info] of this.processRegistry) {
      if (info.status === 'running') {
        console.log(`[Sandbox] Cleaning up PID ${pid}`);
        try {
          process.kill(pid, 'SIGTERM');
        } catch (err) {
          // Process may have already ended
        }
      }
    }
    this.processRegistry.clear();
  }

  /**
   * Health check for all tracked processes
   */
  healthCheck() {
    const health = {
      timestamp: new Date().toISOString(),
      processes: [],
    };

    for (const [pid, info] of this.processRegistry) {
      const isRunning = this.isProcessRunning(pid);
      health.processes.push({
        pid,
        status: info.status,
        isRunning,
        duration: isRunning ? Date.now() - info.startTime : info.duration,
      });
    }

    return health;
  }

  /**
   * Check if process is running
   */
  isProcessRunning(pid) {
    try {
      process.kill(pid, 0);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Generate unique ID
   */
  generateId() {
    return `sandbox-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Hash content for comparison
   */
  hashContent(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }
}

/**
 * Create a sandbox tester instance
 */
function createSandbox(options = {}) {
  return new SandboxTester(options);
}

/**
 * Quick test function
 */
async function runQuickTest(mode = 'dry-run') {
  const sandbox = createSandbox({ mode });
  
  // Test basic commands
  await sandbox.execute('echo', ['Hello', 'Sandbox']);
  await sandbox.execute('pwd');
  await sandbox.execute('ls', ['-la']);
  
  // Generate report
  const report = sandbox.generateReport('quick-test');
  
  console.log(`\n[Sandbox] Summary:`);
  console.log(`  Mode: ${mode}`);
  console.log(`  Executions: ${report.summary.totalExecutions}`);
  console.log(`  Simulated: ${report.summary.simulated}`);
  console.log(`  Mocked: ${report.summary.mocked}`);
  
  return report;
}

// Export for use as module
module.exports = {
  SandboxTester,
  createSandbox,
  runQuickTest,
  CONFIG,
};

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const mode = args[0] || 'dry-run';
  
  console.log(`Running sandbox test in ${mode} mode...\n`);
  runQuickTest(mode).then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Sandbox test failed:', err);
    process.exit(1);
  });
}
