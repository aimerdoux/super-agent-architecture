#!/usr/bin/env node
/**
 * Sandbox Framework Integration Test
 * Tests all modes and agent spawning functionality
 */

const { createSandbox } = require('./sandbox-tester');
const path = require('path');

async function runIntegrationTest() {
  console.log('='.repeat(60));
  console.log('SANDBOX FRAMEWORK INTEGRATION TEST');
  console.log('='.repeat(60));
  
  const agentPath = path.join(__dirname, 'sample-agent.js');
  const testInputs = ['input-alpha', 'input-beta', 'input-gamma'];
  
  // Test all modes
  const modes = ['dry-run', 'mock', 'limited'];
  const results = {};
  
  for (const mode of modes) {
    console.log(`\n--- Testing ${mode.toUpperCase()} mode ---\n`);
    
    const sandbox = createSandbox({ mode });
    
    // Test basic commands
    console.log('Testing basic commands:');
    await sandbox.execute('echo', ['Test message']);
    await sandbox.execute('pwd');
    
    // Test agent spawning
    console.log('\nTesting agent spawning:');
    const agentResults = await sandbox.testAgent(agentPath, testInputs);
    
    // Generate mode-specific report
    const report = sandbox.generateReport(`${mode}-integration-test`);
    results[mode] = {
      report,
      agentResults,
    };
    
    console.log(`\n${mode.toUpperCase()} Mode Results:`);
    console.log(`  Total executions: ${report.summary.totalExecutions}`);
    console.log(`  Success: ${report.summary.simulated + report.summary.mocked + report.summary.limited}`);
    
    sandbox.cleanup();
  }
  
  // Cross-mode comparison
  console.log('\n' + '='.repeat(60));
  console.log('CROSS-MODE COMPARISON');
  console.log('='.repeat(60));
  
  console.log('\nMode'.padEnd(12) + 'Executions'.padEnd(12) + 'Simulated'.padEnd(12) + 'Mocked');
  console.log('-'.repeat(48));
  
  for (const mode of modes) {
    const summary = results[mode].report.summary;
    console.log(
      mode.padEnd(12) +
      String(summary.totalExecutions).padEnd(12) +
      String(summary.simulated).padEnd(12) +
      summary.mocked
    );
  }
  
  // Health check demo
  console.log('\n' + '='.repeat(60));
  console.log('HEALTH CHECK DEMO');
  console.log('='.repeat(60));
  
  const prodSandbox = createSandbox({ mode: 'limited' });
  await prodSandbox.execute('echo', ['Health check test']);
  const health = prodSandbox.healthCheck();
  console.log('\nHealth Check Result:');
  console.log(JSON.stringify(health, null, 2));
  
  // File rollback demo
  console.log('\n' + '='.repeat(60));
  console.log('FILE ROLLBACK DEMO');
  console.log('='.repeat(60));
  
  const rollbackSandbox = createSandbox({ mode: 'mock' });
  rollbackSandbox.snapshotFile(agentPath, 'before');
  // Simulate file modification (in real test, actual file would be modified)
  rollbackSandbox.snapshotFile(agentPath, 'after');
  const comparison = rollbackSandbox.compareSnapshots(agentPath);
  console.log('\nFile Comparison:');
  console.log(JSON.stringify(comparison, null, 2));
  
  console.log('\n' + '='.repeat(60));
  console.log('INTEGRATION TEST COMPLETED SUCCESSFULLY');
  console.log('='.repeat(60));
  
  return results;
}

// Run if executed directly
if (require.main === module) {
  runIntegrationTest().then(() => {
    process.exit(0);
  }).catch(err => {
    console.error('Integration test failed:', err);
    process.exit(1);
  });
}

module.exports = { runIntegrationTest };
