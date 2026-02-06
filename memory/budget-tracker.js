/**
 * Budget Tracker for Model Usage
 * Tracks API calls across MiniMax, Cursor CLI, and Claude Code
 * 
 * Usage: node memory/budget-tracker.js [command]
 * Commands: track, status, alert, rotate, reset
 */

const fs = require('fs');
const path = require('path');

const BUDGET_FILE = path.join(__dirname, 'budget-tracker.json');
const LOG_FILE = path.join(__dirname, 'budget-log.json');

// Budget configuration
const BUDGET_CONFIG = {
  minimax: {
    name: 'MiniMax',
    tier: 1,
    maxPromptsPerWindow: 100,
    windowHours: 5,
    throttleMinutes: 3,
    alerts: {
      warning: 0.7,      // 70% usage
      critical: 0.9      // 90% usage
    }
  },
  cursor: {
    name: 'Cursor CLI',
    tier: 2,
    maxPromptsPerWindow: Infinity,
    windowHours: 1,
    unlimited: true,
    modelOptions: ['auto', 'claude', 'gpt-5.2']
  },
  claudeCode: {
    name: 'Claude Code',
    tier: 3,
    maxPromptsPerWindow: 50,  // Conservative estimate - research actual limits
    windowHours: 1,
    alerts: {
      warning: 0.6,
      critical: 0.8
    }
  }
};

/**
 * Load budget state from file
 */
function loadBudgetState() {
  try {
    if (fs.existsSync(BUDGET_FILE)) {
      return JSON.parse(fs.readFileSync(BUDGET_FILE, 'utf8'));
    }
  } catch (err) {
    console.error('Error loading budget state:', err.message);
  }
  
  return {
    providers: {
      minimax: { count: 0, windowStart: null },
      cursor: { count: 0, windowStart: null },
      claudeCode: { count: 0, windowStart: null }
    },
    totalCost: { minimax: 0, cursor: 0, claudeCode: 0 },
    lastUpdated: new Date().toISOString(),
    alerts: []
  };
}

/**
 * Save budget state to file
 */
function saveBudgetState(state) {
  state.lastUpdated = new Date().toISOString();
  fs.writeFileSync(BUDGET_FILE, JSON.stringify(state, null, 2));
}

/**
 * Record an API call
 */
function trackCall(provider, model = 'default') {
  const state = loadBudgetState();
  const config = BUDGET_CONFIG[provider];
  
  if (!config) {
    console.error(`Unknown provider: ${provider}`);
    return null;
  }
  
  const now = Date.now();
  const windowMs = config.windowHours * 60 * 60 * 1000;
  
  // Initialize provider if needed
  if (!state.providers[provider]) {
    state.providers[provider] = { count: 0, windowStart: now };
  }
  
  // Reset window if expired
  if (!state.providers[provider].windowStart || 
      (now - state.providers[provider].windowStart) > windowMs) {
    state.providers[provider].windowStart = now;
    state.providers[provider].count = 0;
  }
  
  // Increment count
  state.providers[provider].count++;
  
  // Check for alerts
  if (!config.unlimited && config.alerts) {
    const usageRatio = state.providers[provider].count / config.maxPromptsPerWindow;
    
    if (usageRatio >= config.alerts.critical) {
      const alert = {
        provider,
        level: 'CRITICAL',
        message: `${config.name} approaching limit: ${state.providers[provider].count}/${config.maxPromptsPerWindow} prompts`,
        timestamp: now
      };
      state.alerts.push(alert);
      console.log(`🚨 CRITICAL: ${alert.message}`);
    } else if (usageRatio >= config.alerts.warning) {
      console.log(`⚠️  WARNING: ${config.name} at ${Math.round(usageRatio * 100)}% capacity`);
    }
  }
  
  // Log to history
  logCall(provider, model, now);
  
  saveBudgetState(state);
  
  return {
    provider,
    count: state.providers[provider].count,
    max: config.maxPromptsPerWindow,
    remaining: config.unlimited ? 'unlimited' : config.maxPromptsPerWindow - state.providers[provider].count
  };
}

/**
 * Log API call to history
 */
function logCall(provider, model, timestamp) {
  try {
    let log = [];
    if (fs.existsSync(LOG_FILE)) {
      log = JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
    }
    
    log.push({ provider, model, timestamp });
    
    // Keep last 1000 entries
    if (log.length > 1000) {
      log = log.slice(-1000);
    }
    
    fs.writeFileSync(LOG_FILE, JSON.stringify(log, null, 2));
  } catch (err) {
    console.error('Error logging call:', err.message);
  }
}

/**
 * Get current budget status
 */
function getStatus() {
  const state = loadBudgetState();
  const status = {};
  
  for (const [provider, config] of Object.entries(BUDGET_CONFIG)) {
    const providerState = state.providers[provider] || { count: 0, windowStart: null };
    const now = Date.now();
    
    let timeRemaining = null;
    if (providerState.windowStart) {
      const windowMs = config.windowHours * 60 * 60 * 1000;
      const elapsed = now - providerState.windowStart;
      timeRemaining = Math.max(0, Math.ceil((windowMs - elapsed) / 60000)); // minutes
    }
    
    status[provider] = {
      name: config.name,
      tier: config.tier,
      count: providerState.count,
      max: config.unlimited ? 'unlimited' : config.maxPromptsPerWindow,
      remaining: config.unlimited ? 'unlimited' : config.maxPromptsPerWindow - providerState.count,
      timeRemaining: config.unlimited ? null : timeRemaining,
      usagePercent: config.unlimited ? 0 : Math.round((providerState.count / config.maxPromptsPerWindow) * 100)
    };
  }
  
  return status;
}

/**
 * Suggest best provider based on current budget
 */
function suggestProvider(taskType) {
  const status = getStatus();
  
  // Task type mapping
  const taskMapping = {
    'simple': 'minimax',
    'qa': 'minimax',
    'memory': 'minimax',
    'status': 'minimax',
    'development': 'cursor',
    'code': 'cursor',
    'file': 'cursor',
    'long-running': 'cursor',
    'reasoning': 'claudeCode',
    'planning': 'claudeCode',
    'complex': 'claudeCode',
    'meta': 'claudeCode'
  };
  
  const preferred = taskMapping[taskType.toLowerCase()] || 'minimax';
  
  // Check if preferred provider has capacity
  const preferredStatus = status[preferred];
  if (preferredStatus && preferredStatus.remaining !== 0) {
    return { provider: preferred, reason: `Preferred for ${taskType} tasks` };
  }
  
  // Find best alternative with capacity
  const sortedProviders = Object.entries(status)
    .filter(([_, s]) => s.remaining > 0 || s.remaining === 'unlimited')
    .sort((a, b) => a[1].tier - b[1].tier);
  
  if (sortedProviders.length > 0) {
    return { 
      provider: sortedProviders[0][0], 
      reason: `${preferred} exhausted, using ${sortedProviders[0][1].name}`,
      original: preferred
    };
  }
  
  // All exhausted - return minimax with throttle warning
  return { 
    provider: 'minimax', 
    reason: 'All providers at capacity, using MiniMax with throttle',
    warning: true
  };
}

/**
 * Clear alerts
 */
function clearAlerts() {
  const state = loadBudgetState();
  state.alerts = [];
  saveBudgetState(state);
  console.log('Alerts cleared');
}

/**
 * Reset budget for a provider
 */
function resetProvider(provider) {
  const state = loadBudgetState();
  if (state.providers[provider]) {
    state.providers[provider].count = 0;
    state.providers[provider].windowStart = null;
    saveBudgetState(state);
    console.log(`${provider} budget reset`);
  } else {
    console.log(`Provider ${provider} not found`);
  }
}

/**
 * Print formatted status
 */
function printStatus() {
  const status = getStatus();
  
  console.log('\n📊 BUDGET STATUS');
  console.log('═'.repeat(50));
  
  for (const [key, s] of Object.entries(status)) {
    const bar = s.max === 'unlimited' 
      ? '░░░░░░░░░░' 
      : '█'.repeat(Math.min(10, Math.ceil(s.usagePercent / 10))) + 
        '░'.repeat(10 - Math.min(10, Math.ceil(s.usagePercent / 10)));
    
    const remaining = s.remaining === 'unlimited' ? '∞' : s.remaining;
    const time = s.timeRemaining ? `${s.timeRemaining}min left` : '';
    
    console.log(`${s.name.padEnd(15)} [${bar}] ${s.count}/${s.max} (${remaining} left) ${time}`);
  }
  
  console.log('═'.repeat(50) + '\n');
  
  return status;
}

// CLI interface
function main() {
  const args = process.argv.slice(2);
  const command = args[0] || 'status';
  
  switch (command) {
    case 'track':
      const provider = args[1] || 'minimax';
      const model = args[2] || 'default';
      const result = trackCall(provider, model);
      console.log('Tracked:', result);
      break;
      
    case 'status':
      printStatus();
      break;
      
    case 'suggest':
      const taskType = args[1] || 'simple';
      const suggestion = suggestProvider(taskType);
      console.log(`Suggested provider for "${taskType}": ${suggestion.provider}`);
      if (suggestion.reason) console.log(`Reason: ${suggestion.reason}`);
      break;
      
    case 'alert':
      const state = loadBudgetState();
      if (state.alerts.length > 0) {
        console.log('Active alerts:', state.alerts);
      } else {
        console.log('No active alerts');
      }
      break;
      
    case 'clear':
      clearAlerts();
      break;
      
    case 'reset':
      const providerToReset = args[1] || 'all';
      if (providerToReset === 'all') {
        Object.keys(BUDGET_CONFIG).forEach(p => resetProvider(p));
      } else {
        resetProvider(providerToReset);
      }
      break;
      
    case 'rotate':
      const task = args[1] || 'simple';
      const rotation = suggestProvider(task);
      console.log('Rotate to:', rotation);
      break;
      
    default:
      console.log('Budget Tracker - Usage:');
      console.log('  node budget-tracker.js track [provider] [model]  - Track an API call');
      console.log('  node budget-tracker.js status                    - Show current status');
      console.log('  node budget-tracker.js suggest [task]           - Suggest provider for task');
      console.log('  node budget-tracker.js alert                    - Show active alerts');
      console.log('  node budget-tracker.js clear                    - Clear alerts');
      console.log('  node budget-tracker.js reset [provider|all]     - Reset budget counters');
      console.log('  node budget-tracker.js rotate [task]            - Suggest and rotate provider');
      console.log('\nProviders: minimax, cursor, claudeCode');
      console.log('Task types: simple, development, reasoning');
  }
}

// Export for use as module
module.exports = {
  trackCall,
  getStatus,
  suggestProvider,
  clearAlerts,
  resetProvider,
  BUDGET_CONFIG
};

// Run if called directly
if (require.main === module) {
  main();
}
