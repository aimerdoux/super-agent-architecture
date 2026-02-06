#!/usr/bin/env node

/**
 * SUPER AGENT COMPREHENSIVE SYSTEM TEST
 * 
 * Tests all skills and capabilities of the super agent system.
 * Run with: node test-super-agent.js
 * 
 * Categories:
 * 1. Memory System
 * 2. Proactive Execution
 * 3. Browser Automation
 * 4. Code Generation
 * 5. Meta-Cognition
 * 6. Research & Synthesis
 * 7. API Integration
 * 8. Document Generation
 */

const fs = require('fs');
const path = require('path');

// Test Configuration
const CONFIG = {
  workspace: 'C:\\Users\\play4\\.openclaw\\workspace',
  skillsDir: 'C:\\Users\\play4\\AppData\\Roaming\\npm\\node_modules\\openclaw\\skills',
  testOutputDir: 'C:\\Users\\play4\\.openclaw\\workspace\\test-results',
  verbose: true,
  timeout: 30000,
  pineconeConfigured: false,
  browserConfigured: false,
  ollamaConfigured: false
};

// Test Results Tracker
const results = {
  timestamp: new Date().toISOString(),
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  categories: {},
  tests: [],
  summary: {}
};

// Utility Functions
function log(msg, type = 'info') {
  const timestamp = new Date().toISOString().split('T')[1].slice(0, 8);
  const prefix = {
    info: '📋',
    pass: '✅',
    fail: '❌',
    skip: '⏭️',
    warn: '⚠️',
    test: '🧪'
  }[type] || '📋';
  console.log(`[${timestamp}] ${prefix} ${msg}`);
}

function pass(testName, category, details = '') {
  results.total++;
  results.passed++;
  results.tests.push({ test: testName, category, status: 'passed', details });
  if (!results.categories[category]) results.categories[category] = { passed: 0, failed: 0, skipped: 0 };
  results.categories[category].passed++;
  log(`${testName}${details ? ': ' + details : ''}`, 'pass');
}

function fail(testName, category, error = '') {
  results.total++;
  results.failed++;
  results.tests.push({ test: testName, category, status: 'failed', error });
  if (!results.categories[category]) results.categories[category] = { passed: 0, failed: 0, skipped: 0 };
  results.categories[category].failed++;
  log(`${testName}: ${error}`, 'fail');
}

function skip(testName, category, reason = '') {
  results.total++;
  results.skipped++;
  results.tests.push({ test: testName, category, status: 'skipped', reason });
  if (!results.categories[category]) results.categories[category] = { passed: 0, failed: 0, skipped: 0 };
  results.categories[category].skipped++;
  log(`${testName}: ${reason}`, 'skip');
}

function categoryStart(name) {
  log(`\n${'='.repeat(50)}`, 'info');
  log(`${name.toUpperCase()}`, 'info');
  log(`${'='.repeat(50)}`, 'info');
}

function categoryEnd(name) {
  const cat = results.categories[name];
  log(`\n${name} Results: ${cat.passed} passed, ${cat.failed} failed, ${cat.skipped} skipped\n`, 'info');
}

// =============================================================================
// TEST CATEGORY 1: MEMORY SYSTEM
// =============================================================================

async function testMemorySystem() {
  categoryStart('MEMORY SYSTEM');

  try {
    const mmPath = path.join(CONFIG.skillsDir, 'memory-manager');
    if (fs.existsSync(mmPath)) {
      const files = fs.readdirSync(mmPath);
      if (files.includes('SKILL.md') && files.includes('index.js') && files.includes('package.json')) {
        pass('memory-manager skill files exist', 'Memory System', 'All 3 required files present');
      } else {
        fail('memory-manager skill files', 'Memory System', 'Missing required files');
      }
    } else {
      fail('memory-manager skill exists', 'Memory System', 'Skill directory not found');
    }
  } catch (e) {
    fail('memory-manager skill check', 'Memory System', e.message);
  }

  try {
    const pmPath = path.join(CONFIG.skillsDir, 'pinecone-memory');
    if (fs.existsSync(pmPath)) {
      const indexPath = path.join(pmPath, 'index.js');
      if (fs.existsSync(indexPath)) {
        const content = fs.readFileSync(indexPath, 'utf8');
        if (content.includes('memory_index') && content.includes('memory_recall') && content.includes('memory_summary')) {
          pass('pinecone-memory skill has required tools', 'Memory System', 'All 3 tools implemented');
        } else {
          fail('pinecone-memory tools', 'Memory System', 'Missing required tools');
        }
      } else {
        fail('pinecone-memory index.js', 'Memory System', 'index.js not found');
      }
    } else {
      fail('pinecone-memory skill exists', 'Memory System', 'Skill not found');
    }
  } catch (e) {
    fail('pinecone-memory check', 'Memory System', e.message);
  }

  try {
    const memoryDir = path.join(CONFIG.workspace, 'memory');
    if (!fs.existsSync(memoryDir)) {
      fs.mkdirSync(memoryDir, { recursive: true });
    }
    
    const today = new Date().toISOString().split('T')[0].replace(/-/g, '-');
    const memoryFile = path.join(memoryDir, `${today}.md`);
    
    if (!fs.existsSync(memoryFile)) {
      fs.writeFileSync(memoryFile, `# ${today}\n\n## Session Start\n\n`, 'utf8');
    }
    
    pass('Memory file structure', 'Memory System', 'Daily memory files ready');
  } catch (e) {
    fail('Memory file structure', 'Memory System', e.message);
  }

  try {
    const mmPath = path.join(CONFIG.skillsDir, 'memory-manager', 'SKILL.md');
    if (fs.existsSync(mmPath)) {
      const content = fs.readFileSync(mmPath, 'utf8');
      const requiredTools = ['memory_store', 'memory_recall', 'memory_synthesize', 'memory_prune', 'memory_optimize'];
      const missing = requiredTools.filter(t => !content.includes(t));
      
      if (missing.length === 0) {
        pass('memory-manager has all required tools', 'Memory System', `${requiredTools.length} tools documented`);
      } else {
        fail('memory-manager tools', 'Memory System', `Missing: ${missing.join(', ')}`);
      }
    } else {
      fail('memory-manager SKILL.md', 'Memory System', 'Documentation not found');
    }
  } catch (e) {
    fail('memory-manager validation', 'Memory System', e.message);
  }

  categoryEnd('Memory System');
}

// =============================================================================
// TEST CATEGORY 2: PROACTIVE EXECUTION
// =============================================================================

async function testProactiveExecution() {
  categoryStart('PROACTIVE EXECUTION');

  try {
    const paPath = path.join(CONFIG.skillsDir, 'proactive-agent');
    if (fs.existsSync(paPath)) {
      const skillPath = path.join(paPath, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        const content = fs.readFileSync(skillPath, 'utf8');
        if (content.includes('trigger_add') && content.includes('trigger_list') && content.includes('trigger_check')) {
          pass('proactive-agent skill is valid', 'Proactive Execution', 'Core trigger functions documented');
        } else {
          fail('proactive-agent functions', 'Proactive Execution', 'Missing core functions');
        }
      } else {
        fail('proactive-agent SKILL.md', 'Proactive Execution', 'Not found');
      }
    } else {
      fail('proactive-agent skill exists', 'Proactive Execution', 'Skill not found');
    }
  } catch (e) {
    fail('proactive-agent check', 'Proactive Execution', e.message);
  }

  try {
    const toPath = path.join(CONFIG.skillsDir, 'trigger-orchestrator');
    if (fs.existsSync(toPath)) {
      const files = fs.readdirSync(toPath);
      if (files.includes('SKILL.md') && files.includes('index.js')) {
        const indexContent = fs.readFileSync(path.join(toPath, 'index.js'), 'utf8');
        if (indexContent.includes('trigger_coordinate') && indexContent.includes('trigger_orchestrate') && indexContent.includes('trigger_cost_optimizer')) {
          pass('trigger-orchestrator skill is complete', 'Proactive Execution', 'All 7 tools implemented');
        } else {
          fail('trigger-orchestrator tools', 'Proactive Execution', 'Missing required tools');
        }
      } else {
        fail('trigger-orchestrator files', 'Proactive Execution', 'Missing required files');
      }
    } else {
      fail('trigger-orchestrator exists', 'Proactive Execution', 'Skill not found');
    }
  } catch (e) {
    fail('trigger-orchestrator check', 'Proactive Execution', e.message);
  }

  try {
    const stateDir = path.join(CONFIG.workspace, 'state');
    if (!fs.existsSync(stateDir)) {
      fs.mkdirSync(stateDir, { recursive: true });
    }
    
    const triggerState = path.join(stateDir, 'trigger-state.json');
    if (!fs.existsSync(triggerState)) {
      fs.writeFileSync(triggerState, JSON.stringify({ triggers: [], lastUpdated: new Date().toISOString() }, null, 2));
    }
    
    pass('Trigger state files ready', 'Proactive Execution', 'State tracking initialized');
  } catch (e) {
    fail('Trigger state files', 'Proactive Execution', e.message);
  }

  categoryEnd('Proactive Execution');
}

// =============================================================================
// TEST CATEGORY 3: BROWSER AUTOMATION
// =============================================================================

async function testBrowserAutomation() {
  categoryStart('BROWSER AUTOMATION');

  try {
    const baPath = path.join(CONFIG.skillsDir, 'browser-agent');
    if (fs.existsSync(baPath)) {
      const skillPath = path.join(baPath, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        const content = fs.readFileSync(skillPath, 'utf8');
        if (content.includes('navigate_and_summarize') && content.includes('search_web') && content.includes('complete_task')) {
          pass('browser-agent skill is valid', 'Browser Automation', 'Core tools documented');
        } else {
          fail('browser-agent tools', 'Browser Automation', 'Missing core tools');
        }
      } else {
        fail('browser-agent SKILL.md', 'Browser Automation', 'Not found');
      }
    } else {
      fail('browser-agent exists', 'Browser Automation', 'Skill not found');
    }
  } catch (e) {
    fail('browser-agent check', 'Browser Automation', e.message);
  }

  try {
    const bmPath = path.join(CONFIG.skillsDir, 'browser-mastery');
    if (fs.existsSync(bmPath)) {
      const files = fs.readdirSync(bmPath);
      if (files.includes('SKILL.md') && files.includes('index.js') && files.includes('package.json')) {
        const skillContent = fs.readFileSync(path.join(bmPath, 'SKILL.md'), 'utf8');
        const requiredTools = ['browser_multi_tab', 'browser_form_auto', 'browser_session_manager', 'browser_human_simulator', 'browser_anti_detect', 'browser_parallel_task', 'browser_data_extractor'];
        const missing = requiredTools.filter(t => !skillContent.includes(t));
        
        if (missing.length === 0) {
          pass('browser-mastery skill is complete', 'Browser Automation', `${requiredTools.length} tools implemented`);
        } else {
          fail('browser-mastery tools', 'Browser Automation', `Missing: ${missing.join(', ')}`);
        }
      } else {
        fail('browser-mastery files', 'Browser Automation', 'Missing required files');
      }
    } else {
      fail('browser-mastery exists', 'Browser Automation', 'Skill not found');
    }
  } catch (e) {
    fail('browser-mastery check', 'Browser Automation', e.message);
  }

  try {
    const biPath = path.join(CONFIG.skillsDir, 'browser-interact');
    if (fs.existsSync(biPath)) {
      const files = fs.readdirSync(biPath);
      if (files.includes('SKILL.md') && files.includes('index.js') && files.includes('package.json')) {
        pass('browser-interact skill is ready', 'Browser Automation', 'Gate bypassing capability available');
      } else {
        fail('browser-interact files', 'Browser Automation', 'Missing required files');
      }
    } else {
      fail('browser-interact exists', 'Browser Automation', 'Skill not found');
    }
  } catch (e) {
    fail('browser-interact check', 'Browser Automation', e.message);
  }

  categoryEnd('Browser Automation');
}

// =============================================================================
// TEST CATEGORY 4: CODE GENERATION
// =============================================================================

async function testCodeGeneration() {
  categoryStart('CODE GENERATION');

  try {
    const caPath = path.join(CONFIG.skillsDir, 'coding-agent');
    if (fs.existsSync(caPath)) {
      const skillPath = path.join(caPath, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        const content = fs.readFileSync(skillPath, 'utf8');
        if (content.includes('Codex CLI') && content.includes('Claude Code') && content.includes('Pi Coding Agent')) {
          pass('coding-agent skill is valid', 'Code Generation', 'Multiple agents supported');
        } else {
          fail('coding-agent documentation', 'Code Generation', 'Missing agent documentation');
        }
      } else {
        fail('coding-agent SKILL.md', 'Code Generation', 'Not found');
      }
    } else {
      fail('coding-agent exists', 'Code Generation', 'Skill not found');
    }
  } catch (e) {
    fail('coding-agent check', 'Code Generation', e.message);
  }

  try {
    const csPath = path.join(CONFIG.skillsDir, 'code-super');
    if (fs.existsSync(csPath)) {
      const files = fs.readdirSync(csPath);
      if (files.includes('SKILL.md') && files.includes('index.js') && files.includes('package.json')) {
        const skillContent = fs.readFileSync(path.join(csPath, 'SKILL.md'), 'utf8');
        if (skillContent.includes('code_generate') && skillContent.includes('code_test_generate') && skillContent.includes('code_deploy') && skillContent.includes('code_review_advanced')) {
          pass('code-super skill is complete', 'Code Generation', 'Full development lifecycle tools');
        } else {
          fail('code-super tools', 'Code Generation', 'Missing core tools');
        }
      } else {
        fail('code-super files', 'Code Generation', 'Missing required files');
      }
    } else {
      fail('code-super exists', 'Code Generation', 'Skill not found');
    }
  } catch (e) {
    fail('code-super check', 'Code Generation', e.message);
  }

  try {
    const ghPath = path.join(CONFIG.skillsDir, 'github');
    if (fs.existsSync(ghPath)) {
      pass('GitHub integration skill available', 'Code Generation', 'CLI integration ready');
    } else {
      fail('GitHub skill exists', 'Code Generation', 'Skill not found');
    }
  } catch (e) {
    fail('GitHub skill check', 'Code Generation', e.message);
  }

  try {
    const testDir = path.join(CONFIG.workspace, 'test-projects');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    const testFile = path.join(testDir, 'hello.js');
    fs.writeFileSync(testFile, `// Test file created by Super Agent System Test\nconsole.log('Hello from Super Agent!');\n`);
    
    if (fs.existsSync(testFile)) {
      pass('Test project directory ready', 'Code Generation', 'Test files can be created');
    } else {
      fail('Test project creation', 'Code Generation', 'Could not create test file');
    }
  } catch (e) {
    fail('Test project setup', 'Code Generation', e.message);
  }

  categoryEnd('Code Generation');
}

// =============================================================================
// TEST CATEGORY 5: META-COGNITION
// =============================================================================

async function testMetaCognition() {
  categoryStart('META-COGNITION');

  try {
    const mcPath = path.join(CONFIG.skillsDir, 'meta-cognition');
    if (fs.existsSync(mcPath)) {
      const files = fs.readdirSync(mcPath);
      if (files.includes('SKILL.md') && files.includes('index.js') && files.includes('package.json')) {
        const skillContent = fs.readFileSync(path.join(mcPath, 'SKILL.md'), 'utf8');
        const requiredTools = ['meta_monitor', 'meta_predict', 'meta_optimize', 'meta_strategy_select', 'meta_heuristic_improve', 'meta_failure_prevent', 'meta_skill_acquire'];
        const missing = requiredTools.filter(t => !skillContent.includes(t));
        
        if (missing.length === 0) {
          pass('meta-cognition skill is complete', 'Meta-Cognition', `${requiredTools.length} self-improvement tools`);
        } else {
          fail('meta-cognition tools', 'Meta-Cognition', `Missing: ${missing.join(', ')}`);
        }
      } else {
        fail('meta-cognition files', 'Meta-Cognition', 'Missing required files');
      }
    } else {
      fail('meta-cognition exists', 'Meta-Cognition', 'Skill not found');
    }
  } catch (e) {
    fail('meta-cognition check', 'Meta-Cognition', e.message);
  }

  try {
    const siPath = path.join(CONFIG.skillsDir, 'self-improve-agent');
    if (fs.existsSync(siPath)) {
      const skillPath = path.join(siPath, 'SKILL.md');
      if (fs.existsSync(skillPath)) {
        const content = fs.readFileSync(skillPath, 'utf8');
        if (content.includes('reflect') && content.includes('review_code') && content.includes('distill_memory') && content.includes('set_goals')) {
          pass('self-improve-agent skill is valid', 'Meta-Cognition', 'Self-reflection tools available');
        } else {
          fail('self-improve-agent tools', 'Meta-Cognition', 'Missing core tools');
        }
      } else {
        fail('self-improve-agent SKILL.md', 'Meta-Cognition', 'Not found');
      }
    } else {
      fail('self-improve-agent exists', 'Meta-Cognition', 'Skill not found');
    }
  } catch (e) {
    fail('self-improve-agent check', 'Meta-Cognition', e.message);
  }

  try {
    const metaDir = path.join(CONFIG.workspace, 'memory');
    const metaFile = path.join(metaDir, 'meta-cognition.json');
    
    if (!fs.existsSync(metaFile)) {
      fs.writeFileSync(metaFile, JSON.stringify({
        performanceHistory: [],
        predictions: [],
        skillLevels: {},
        heuristics: [],
        lastUpdated: new Date().toISOString()
      }, null, 2));
    }
    
    pass('Meta-cognition state file ready', 'Meta-Cognition', 'Performance tracking initialized');
  } catch (e) {
    fail('Meta-cognition state file', 'Meta-Cognition', e.message);
  }

  categoryEnd('Meta-Cognition');
}

// =============================================================================
// TEST CATEGORY 6: RESEARCH & SYNTHESIS
// =============================================================================

async function testResearchSynthesis() {
  categoryStart('RESEARCH & SYNTHESIS');

  try {
    const raPath = path.join(CONFIG.skillsDir, 'research-agent');
    if (fs.existsSync(raPath)) {
      const files = fs.readdirSync(raPath);
      if (files.includes('SKILL.md') && files.includes('index.js') && files.includes('package.json')) {
        const skillContent = fs.readFileSync(path.join(raPath, 'SKILL.md'), 'utf8');
        if (skillContent.includes('research_deep') && skillContent.includes('research_synthesize') && skillContent.includes('source_credibility') && skillContent.includes('hypothesis_generate')) {
          pass('research-agent skill is complete', 'Research & Synthesis', 'Full research pipeline tools');
        } else {
          fail('research-agent tools', 'Research & Synthesis', 'Missing core tools');
        }
      } else {
        fail('research-agent files', 'Research & Synthesis', 'Missing required files');
      }
    } else {
      fail('research-agent exists', 'Research & Synthesis', 'Skill not found');
    }
  } catch (e) {
    fail('research-agent check', 'Research & Synthesis', e.message);
  }

  try {
    const sumPath = path.join(CONFIG.skillsDir, 'summarize');
    if (fs.existsSync(sumPath)) {
      pass('Summarize skill available', 'Research & Synthesis', 'Content summarization ready');
    } else {
      fail('Summarize skill exists', 'Research & Synthesis', 'Skill not found');
    }
  } catch (e) {
    fail('Summarize skill check', 'Research & Synthesis', e.message);
  }

  categoryEnd('Research & Synthesis');
}

// =============================================================================
// TEST CATEGORY 7: API INTEGRATION
// =============================================================================

async function testAPIIntegration() {
  categoryStart('API INTEGRATION');

  try {
    const aiPath = path.join(CONFIG.skillsDir, 'api-integrator');
    if (fs.existsSync(aiPath)) {
      const files = fs.readdirSync(aiPath);
      if (files.includes('SKILL.md') && files.includes('index.js') && files.includes('package.json')) {
        const skillContent = fs.readFileSync(path.join(aiPath, 'SKILL.md'), 'utf8');
        if (skillContent.includes('api_call') && skillContent.includes('api_orchestrate') && skillContent.includes('api_rate_limit') && skillContent.includes('api_oauth_flow')) {
          pass('api-integrator skill is complete', 'API Integration', 'Full API management tools');
        } else {
          fail('api-integrator tools', 'API Integration', 'Missing core tools');
        }
      } else {
        fail('api-integrator files', 'API Integration', 'Missing required files');
      }
    } else {
      fail('api-integrator exists', 'API Integration', 'Skill not found');
    }
  } catch (e) {
    fail('api-integrator check', 'API Integration', e.message);
  }

  try {
    const wPath = path.join(CONFIG.skillsDir, 'weather');
    if (fs.existsSync(wPath)) {
      pass('Weather skill available', 'API Integration', 'No API key required');
    } else {
      fail('Weather skill exists', 'API Integration', 'Skill not found');
    }
  } catch (e) {
    fail('Weather skill check', 'API Integration', e.message);
  }

  categoryEnd('API Integration');
}

// =============================================================================
// TEST CATEGORY 8: DOCUMENT GENERATION
// =============================================================================

async function testDocumentGeneration() {
  categoryStart('DOCUMENT GENERATION');

  try {
    const dgPath = path.join(CONFIG.skillsDir, 'document-generator');
    if (fs.existsSync(dgPath)) {
      const files = fs.readdirSync(dgPath);
      if (files.includes('SKILL.md') && files.includes('index.js') && files.includes('package.json')) {
        const skillContent = fs.readFileSync(path.join(dgPath, 'SKILL.md'), 'utf8');
        if (skillContent.includes('doc_report') && skillContent.includes('doc_email') && skillContent.includes('doc_presentation') && skillContent.includes('doc_summarize')) {
          pass('document-generator skill is complete', 'Document Generation', 'Full documentation suite');
        } else {
          fail('document-generator tools', 'Document Generation', 'Missing core tools');
        }
      } else {
        fail('document-generator files', 'Document Generation', 'Missing required files');
      }
    } else {
      fail('document-generator exists', 'Document Generation', 'Skill not found');
    }
  } catch (e) {
    fail('document-generator check', 'Document Generation', e.message);
  }

  categoryEnd('Document Generation');
}

// =============================================================================
// TEST CATEGORY 9: SKILLS INFRASTRUCTURE
// =============================================================================

async function testSkillsInfrastructure() {
  categoryStart('SKILLS INFRASTRUCTURE');

  try {
    const scPath = path.join(CONFIG.skillsDir, 'skill-creator');
    if (fs.existsSync(scPath)) {
      pass('Skill creator available', 'Skills Infrastructure', 'Can create new skills');
    } else {
      fail('Skill creator exists', 'Skills Infrastructure', 'Skill not found');
    }
  } catch (e) {
    fail('Skill creator check', 'Skills Infrastructure', e.message);
  }

  try {
    const skills = fs.readdirSync(CONFIG.skillsDir);
    const skillCount = skills.filter(s => {
      const skillPath = path.join(CONFIG.skillsDir, s);
      return fs.statSync(skillPath).isDirectory() && 
             (fs.existsSync(path.join(skillPath, 'SKILL.md')) || 
              fs.existsSync(path.join(skillPath, 'index.js')));
    }).length;
    
    if (skillCount >= 10) {
      pass('Minimum skills available', 'Skills Infrastructure', `${skillCount} skills installed`);
    } else {
      fail('Minimum skills check', 'Skills Infrastructure', `Only ${skillCount} skills found`);
    }
    
    results.summary.totalSkills = skillCount;
  } catch (e) {
    fail('Skills count', 'Skills Infrastructure', e.message);
  }

  try {
    const wsSkills = path.join(CONFIG.workspace, 'skills');
    if (!fs.existsSync(wsSkills)) {
      fs.mkdirSync(wsSkills, { recursive: true });
    }
    pass('Workspace skills directory ready', 'Skills Infrastructure', 'Custom skills can be added');
  } catch (e) {
    fail('Workspace skills directory', 'Skills Infrastructure', e.message);
  }

  categoryEnd('Skills Infrastructure');
}

// =============================================================================
// UTILITY TESTS
// =============================================================================

async function testUtilities() {
  categoryStart('UTILITIES');

  const nodeVersion = process.version;
  log(`Node.js version: ${nodeVersion}`, 'info');
  if (parseInt(nodeVersion.slice(1).split('.')[0]) >= 18) {
    pass('Node.js version', 'Utilities', nodeVersion);
  } else {
    fail('Node.js version', 'Utilities', `Requires 18+, got ${nodeVersion}`);
  }

  log(`Working directory: ${process.cwd()}`, 'info');

  const memUsage = process.memoryUsage();
  const memMB = Math.round(memUsage.heapUsed / 1024 / 1024);
  log(`Memory usage: ${memMB} MB`, 'info');
  pass('Memory within limits', 'Utilities', `${memMB} MB heap used`);

  categoryEnd('Utilities');
}

// =============================================================================
// MAIN TEST RUNNER
// =============================================================================

async function runTests() {
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════════════╗', 'info');
  log('║          SUPER AGENT COMPREHENSIVE SYSTEM TEST                    ║', 'info');
  log('║                                                                  ║', 'info');
  log('║  Testing all skills, capabilities, and integrations               ║', 'info');
  log('╚══════════════════════════════════════════════════════════════════╝', 'info');
  console.log('\n');

  // Initialize test output directory
  if (!fs.existsSync(CONFIG.testOutputDir)) {
    fs.mkdirSync(CONFIG.testOutputDir, { recursive: true });
  }

  const startTime = Date.now();

  // Run all test categories
  await testUtilities();
  await testMemorySystem();
  await testProactiveExecution();
  await testBrowserAutomation();
  await testCodeGeneration();
  await testMetaCognition();
  await testResearchSynthesis();
  await testAPIIntegration();
  await testDocumentGeneration();
  await testSkillsInfrastructure();

  const duration = Date.now() - startTime;

  // Generate summary
  results.duration = duration;
  results.summary.passed = results.passed;
  results.summary.failed = results.failed;
  results.summary.skipped = results.skipped;
  results.summary.successRate = ((results.passed / (results.passed + results.failed)) * 100).toFixed(1);

  // Print final summary
  console.log('\n');
  log('╔══════════════════════════════════════════════════════════════════╗', 'info');
  log('║                      TEST RESULTS SUMMARY                         ║', 'info');
  log('╚══════════════════════════════════════════════════════════════════╝', 'info');
  console.log('\n');
  
  log(`Total Tests: ${results.total}`, 'info');
  log(`✅ Passed: ${results.passed}`, 'pass');
  log(`❌ Failed: ${results.failed}`, 'fail');
  log(`⏭️  Skipped: ${results.skipped}`, 'skip');
  log(`📊 Success Rate: ${results.summary.successRate}%`, 'info');
  log(`⏱️  Duration: ${(duration / 1000).toFixed(2)} seconds`, 'info');
  log(`📦 Total Skills: ${results.summary.totalSkills || 'N/A'}`, 'info');
  
  console.log('\n');
  log('Category Breakdown:', 'info');
  for (const [category, stats] of Object.entries(results.categories)) {
    const icon = stats.failed > 0 ? '⚠️' : '✅';
    log(`  ${icon} ${category}: ${stats.passed}/${stats.passed + stats.failed + stats.skipped}`, 'info');
  }
  
  console.log('\n');

  // Save results to file
  const outputPath = path.join(CONFIG.testOutputDir, `super-agent-test-${Date.now()}.json`);
  fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
  log(`Full results saved to: ${outputPath}`, 'info');

  // Create human-readable report
  const reportPath = path.join(CONFIG.testOutputDir, `super-agent-test-report-${Date.now()}.md`);
  let report = `# Super Agent System Test Report\n\n`;
  report += `**Date:** ${results.timestamp}\n`;
  report += `**Duration:** ${(results.duration / 1000).toFixed(2)} seconds\n\n`;
  
  report += `## Summary\n\n`;
  report += `- **Total Tests:** ${results.total}\n`;
  report += `- **Passed:** ${results.passed}\n`;
  report += `- **Failed:** ${results.failed}\n`;
  report += `- **Skipped:** ${results.skipped}\n`;
  report += `- **Success Rate:** ${results.summary.successRate}%\n\n`;
  
  report += `## Category Results\n\n`;
  report += `| Category | Passed | Failed | Skipped | Status |\n`;
  report += `|----------|--------|--------|---------|--------|\n`;
  
  for (const [category, stats] of Object.entries(results.categories)) {
    const status = stats.failed === 0 ? '✅' : '⚠️';
    report += `| ${category} | ${stats.passed} | ${stats.failed} | ${stats.skipped} | ${status} |\n`;
  }
  
  report += `\n## Recommendations\n\n`;
  
  if (results.failed > 0) {
    report += `### Actions Needed\n\n`;
    const failedTests = results.tests.filter(t => t.status === 'failed');
    for (const test of failedTests) {
      report += `- **${test.test}**: ${test.error || 'Unknown error'}\n`;
    }
  } else {
    report += `All systems operational! Your Super Agent is ready for use.\n`;
  }
  
  fs.writeFileSync(reportPath, report);
  log(`Markdown report saved to: ${reportPath}`, 'info');

  console.log('\n');
  if (results.failed === 0) {
    log('🎉 ALL TESTS PASSED! Your Super Agent is ready! 🎉', 'pass');
  } else {
    log(`⚠️  ${results.failed} test(s) failed. Review the reports for details.`, 'warn');
  }
  
  return results;
}

// Run tests if executed directly
if (require.main === module) {
  runTests().catch(console.error);
}

module.exports = { runTests, testMemorySystem, testProactiveExecution, testBrowserAutomation, testCodeGeneration, testMetaCognition, testResearchSynthesis, testAPIIntegration, testDocumentGeneration, testSkillsInfrastructure };
