#!/usr/bin/env node
/**
 * Sample Test Agent for Sandbox Testing
 * 
 * This is a simple agent that can be used to test the sandbox framework.
 * It reads environment variables and produces output based on test inputs.
 */

const fs = require('fs');
const path = require('path');

// Get test input from environment or command line
const testInput = process.env.TEST_INPUT || process.argv[2] || 'default';
const sandboxMode = process.env.SANDBOX_MODE || 'unknown';

// State file for testing file operations
const stateFile = path.join(__dirname, 'memory', 'agent-state.json');

/**
 * Process the test input and return a result
 */
function processInput(input) {
  const result = {
    input,
    timestamp: new Date().toISOString(),
    mode: sandboxMode,
    processed: true,
    data: {
      length: input.length,
      uppercase: input.toUpperCase(),
      reversed: input.split('').reverse().join(''),
    },
  };
  
  // Update state file (for rollback testing)
  updateState(result);
  
  return result;
}

/**
 * Update state file with current result
 */
function updateState(data) {
  try {
    const stateDir = path.dirname(stateFile);
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    
    let currentState = { runs: [] };
    if (fs.existsSync(stateFile)) {
      try {
        currentState = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
      } catch {
        // File exists but invalid JSON
      }
    }
    
    currentState.runs.push(data);
    currentState.lastRun = data.timestamp;
    
    fs.writeFileSync(stateFile, JSON.stringify(currentState, null, 2));
  } catch (err) {
    console.error('Failed to update state:', err.message);
  }
}

/**
 * Main execution
 */
console.log('--- Sample Agent Execution ---');
console.log(`Input: ${testInput}`);
console.log(`Mode: ${sandboxMode}`);
console.log('------------------------------');

const result = processInput(testInput);
console.log(JSON.stringify(result, null, 2));

// Simulate some processing time
if (sandboxMode === 'production') {
  const start = Date.now();
  while (Date.now() - start < 100) {
    // Small delay in production mode
  }
}

process.exit(0);
