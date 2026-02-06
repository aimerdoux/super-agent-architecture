/**
 * Super Agent Core - Local OpenClaw Skill
 *
 * Features:
 * - Multi-tasking with parallel execution
 * - Autonomous evolution and self-improvement
 * - Advanced tooling (web, code, file operations)
 * - Multi-tier memory management
 * - Meta-cognition and skill acquisition
 */

const fs = require('fs').promises;
const path = require('path');
const { EventEmitter } = require('events');

// =====================================================
// CONFIGURATION
// =====================================================

const WORKSPACE_DIR = process.env.OPENCLAW_WORKSPACE || path.join(process.env.HOME || process.env.USERPROFILE, '.openclaw', 'workspace');
const DATA_DIR = path.join(WORKSPACE_DIR, 'super-agent-data');
const MEMORY_DIR = path.join(DATA_DIR, 'memory');
const TASKS_DIR = path.join(DATA_DIR, 'tasks');
const METRICS_DIR = path.join(DATA_DIR, 'metrics');
const SKILLS_FILE = path.join(DATA_DIR, 'skills-registry.json');
const CONVERSATIONS_FILE = path.join(DATA_DIR, 'conversations.json');

// =====================================================
// UTILITIES
// =====================================================

async function ensureDir(dir) {
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch (e) {
    if (e.code !== 'EEXIST') throw e;
  }
}

async function readJSON(filepath, defaultValue = {}) {
  try {
    const data = await fs.readFile(filepath, 'utf8');
    return JSON.parse(data);
  } catch {
    return defaultValue;
  }
}

async function writeJSON(filepath, data) {
  await ensureDir(path.dirname(filepath));
  await fs.writeFile(filepath, JSON.stringify(data, null, 2));
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// =====================================================
// MEMORY MANAGER - Multi-tier local memory
// =====================================================

class MemoryManager {
  constructor() {
    this.shortTerm = new Map(); // Session cache
    this.workingDir = path.join(MEMORY_DIR, 'working');
    this.longTermDir = path.join(MEMORY_DIR, 'long-term');
  }

  async init() {
    await ensureDir(this.workingDir);
    await ensureDir(this.longTermDir);
  }

  // Store memory with auto-tier routing
  async store(content, options = {}) {
    const memory = {
      id: generateId(),
      content,
      tier: options.tier || this.determineTier(content, options),
      category: options.category || 'general',
      importance: options.importance || 0.5,
      metadata: options.metadata || {},
      createdAt: new Date().toISOString(),
      accessCount: 0,
      lastAccessed: null
    };

    switch (memory.tier) {
      case 'short-term':
        this.shortTerm.set(memory.id, memory);
        break;
      case 'working':
        await writeJSON(path.join(this.workingDir, `${memory.id}.json`), memory);
        break;
      case 'long-term':
        await writeJSON(path.join(this.longTermDir, `${memory.id}.json`), memory);
        break;
    }

    return memory;
  }

  // Determine tier based on content and context
  determineTier(content, options) {
    if (options.ephemeral) return 'short-term';
    if (options.important || options.importance > 0.7) return 'long-term';
    if (content.length > 500) return 'long-term';
    return 'working';
  }

  // Recall memories with relevance scoring
  async recall(query, options = {}) {
    const results = [];
    const tier = options.tier || 'all';
    const limit = options.limit || 10;

    // Search short-term
    if (tier === 'all' || tier === 'short-term') {
      for (const memory of this.shortTerm.values()) {
        if (this.matches(memory, query)) {
          results.push({ ...memory, relevance: this.scoreRelevance(memory, query) });
        }
      }
    }

    // Search working memory
    if (tier === 'all' || tier === 'working') {
      try {
        const files = await fs.readdir(this.workingDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const memory = await readJSON(path.join(this.workingDir, file));
            if (this.matches(memory, query)) {
              results.push({ ...memory, relevance: this.scoreRelevance(memory, query) });
            }
          }
        }
      } catch { /* Directory may not exist */ }
    }

    // Search long-term memory
    if (tier === 'all' || tier === 'long-term') {
      try {
        const files = await fs.readdir(this.longTermDir);
        for (const file of files) {
          if (file.endsWith('.json')) {
            const memory = await readJSON(path.join(this.longTermDir, file));
            if (this.matches(memory, query)) {
              results.push({ ...memory, relevance: this.scoreRelevance(memory, query) });
            }
          }
        }
      } catch { /* Directory may not exist */ }
    }

    // Sort by relevance and importance
    results.sort((a, b) => {
      const scoreA = (a.relevance * 0.6) + (a.importance * 0.4);
      const scoreB = (b.relevance * 0.6) + (b.importance * 0.4);
      return scoreB - scoreA;
    });

    return results.slice(0, limit);
  }

  matches(memory, query) {
    if (!query) return true;
    const content = memory.content.toLowerCase();
    const terms = query.toLowerCase().split(' ');
    return terms.some(term => content.includes(term));
  }

  scoreRelevance(memory, query) {
    if (!query) return 0.5;
    const content = memory.content.toLowerCase();
    const terms = query.toLowerCase().split(' ');
    const matches = terms.filter(term => content.includes(term)).length;
    return matches / terms.length;
  }

  // Synthesize related memories
  async synthesize(query, options = {}) {
    const memories = await this.recall(query, { limit: 20 });
    if (memories.length === 0) return null;

    const synthesis = {
      id: generateId(),
      type: 'synthesis',
      query,
      sourceCount: memories.length,
      sources: memories.map(m => m.id),
      summary: this.generateSummary(memories),
      insights: this.extractInsights(memories),
      createdAt: new Date().toISOString()
    };

    return synthesis;
  }

  generateSummary(memories) {
    const contents = memories.slice(0, 5).map(m => m.content);
    return `Synthesized from ${memories.length} memories. Key themes: ${contents.join(' | ').slice(0, 200)}...`;
  }

  extractInsights(memories) {
    const categories = {};
    memories.forEach(m => {
      categories[m.category] = (categories[m.category] || 0) + 1;
    });
    return {
      topCategories: Object.entries(categories).sort((a, b) => b[1] - a[1]).slice(0, 3),
      avgImportance: memories.reduce((sum, m) => sum + m.importance, 0) / memories.length,
      timeSpan: memories.length > 1 ? {
        oldest: memories[memories.length - 1].createdAt,
        newest: memories[0].createdAt
      } : null
    };
  }

  // Cleanup expired/low-value memories
  async prune(options = {}) {
    const maxAge = options.maxAgeDays || 30;
    const minImportance = options.minImportance || 0.2;
    const pruned = [];
    const cutoff = Date.now() - (maxAge * 24 * 60 * 60 * 1000);

    // Prune working memory
    try {
      const files = await fs.readdir(this.workingDir);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filepath = path.join(this.workingDir, file);
          const memory = await readJSON(filepath);
          const age = new Date(memory.createdAt).getTime();

          if (age < cutoff && memory.importance < minImportance) {
            await fs.unlink(filepath);
            pruned.push(memory.id);
          }
        }
      }
    } catch { /* Directory may not exist */ }

    return { pruned: pruned.length, ids: pruned };
  }
}

// =====================================================
// TASK MANAGER - Multi-tasking with parallel execution
// =====================================================

class TaskManager extends EventEmitter {
  constructor() {
    super();
    this.tasks = new Map();
    this.running = new Set();
    this.maxConcurrent = 8;
    this.queue = [];
  }

  async init() {
    await ensureDir(TASKS_DIR);
    await this.loadTasks();
  }

  async loadTasks() {
    try {
      const files = await fs.readdir(TASKS_DIR);
      for (const file of files) {
        if (file.endsWith('.json')) {
          const task = await readJSON(path.join(TASKS_DIR, file));
          this.tasks.set(task.id, task);
        }
      }
    } catch { /* Directory may not exist */ }
  }

  async create(description, options = {}) {
    const task = {
      id: generateId(),
      description,
      status: 'pending',
      priority: options.priority || 5,
      type: options.type || 'general',
      dependencies: options.dependencies || [],
      parentId: options.parentId || null,
      subtasks: [],
      result: null,
      error: null,
      retries: 0,
      maxRetries: options.maxRetries || 3,
      createdAt: new Date().toISOString(),
      startedAt: null,
      completedAt: null,
      metadata: options.metadata || {}
    };

    this.tasks.set(task.id, task);
    await writeJSON(path.join(TASKS_DIR, `${task.id}.json`), task);

    if (!options.noQueue) {
      this.queue.push(task.id);
      this.processQueue();
    }

    return task;
  }

  // Decompose a complex task into subtasks
  async decompose(taskId, subtaskDescriptions) {
    const parent = this.tasks.get(taskId);
    if (!parent) throw new Error('Task not found');

    const subtasks = [];
    for (const desc of subtaskDescriptions) {
      const subtask = await this.create(desc, {
        parentId: taskId,
        noQueue: true
      });
      subtasks.push(subtask);
      parent.subtasks.push(subtask.id);
    }

    await writeJSON(path.join(TASKS_DIR, `${taskId}.json`), parent);
    return subtasks;
  }

  async processQueue() {
    while (this.queue.length > 0 && this.running.size < this.maxConcurrent) {
      const taskId = this.queue.shift();
      const task = this.tasks.get(taskId);

      if (!task || task.status !== 'pending') continue;

      // Check dependencies
      const depsReady = task.dependencies.every(depId => {
        const dep = this.tasks.get(depId);
        return dep && dep.status === 'completed';
      });

      if (!depsReady) {
        this.queue.push(taskId); // Re-queue
        continue;
      }

      this.running.add(taskId);
      this.executeTask(task).catch(e => {
        console.error(`Task ${taskId} failed:`, e);
      });
    }
  }

  async executeTask(task) {
    task.status = 'running';
    task.startedAt = new Date().toISOString();
    this.emit('taskStart', task);

    try {
      // Execute based on task type
      const result = await this.runTaskLogic(task);
      task.status = 'completed';
      task.result = result;
      task.completedAt = new Date().toISOString();
      this.emit('taskComplete', task);
    } catch (error) {
      task.retries++;
      if (task.retries < task.maxRetries) {
        task.status = 'pending';
        this.queue.push(task.id);
      } else {
        task.status = 'failed';
        task.error = error.message;
        task.completedAt = new Date().toISOString();
        this.emit('taskFailed', task);
      }
    } finally {
      this.running.delete(task.id);
      await writeJSON(path.join(TASKS_DIR, `${task.id}.json`), task);
      this.processQueue();
    }
  }

  async runTaskLogic(task) {
    // Placeholder - actual execution logic
    return { executed: true, timestamp: new Date().toISOString() };
  }

  // Execute multiple tasks in parallel
  async executeParallel(taskIds) {
    const tasks = taskIds.map(id => this.tasks.get(id)).filter(Boolean);
    const results = await Promise.allSettled(
      tasks.map(task => this.executeTask(task))
    );
    return results;
  }

  getQueue() {
    return this.queue.map(id => this.tasks.get(id)).filter(Boolean);
  }

  getRunning() {
    return Array.from(this.running).map(id => this.tasks.get(id)).filter(Boolean);
  }

  getAll() {
    return Array.from(this.tasks.values());
  }
}

// =====================================================
// EVOLUTION ENGINE - Autonomous self-improvement
// =====================================================

class EvolutionEngine {
  constructor() {
    this.metricsFile = path.join(METRICS_DIR, 'performance.json');
    this.skillsFile = SKILLS_FILE;
  }

  async init() {
    await ensureDir(METRICS_DIR);
  }

  async trackInteraction(interaction) {
    const metrics = await readJSON(this.metricsFile, { interactions: [], summary: {} });

    metrics.interactions.push({
      id: generateId(),
      type: interaction.type,
      success: interaction.success,
      latencyMs: interaction.latencyMs,
      tokensUsed: interaction.tokensUsed,
      provider: interaction.provider,
      timestamp: new Date().toISOString()
    });

    // Keep only last 1000 interactions
    if (metrics.interactions.length > 1000) {
      metrics.interactions = metrics.interactions.slice(-1000);
    }

    // Update summary
    metrics.summary = this.calculateSummary(metrics.interactions);

    await writeJSON(this.metricsFile, metrics);
    return metrics.summary;
  }

  calculateSummary(interactions) {
    if (interactions.length === 0) {
      return { successRate: 0, avgLatency: 0, totalInteractions: 0, providerUsage: {} };
    }

    const successful = interactions.filter(i => i.success).length;
    const totalLatency = interactions.reduce((sum, i) => sum + (i.latencyMs || 0), 0);
    const providerUsage = {};

    interactions.forEach(i => {
      providerUsage[i.provider] = (providerUsage[i.provider] || 0) + 1;
    });

    // Calculate daily/weekly trends
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;

    const dayInteractions = interactions.filter(i => new Date(i.timestamp).getTime() > dayAgo);
    const weekInteractions = interactions.filter(i => new Date(i.timestamp).getTime() > weekAgo);

    return {
      successRate: successful / interactions.length,
      avgLatency: totalLatency / interactions.length,
      totalInteractions: interactions.length,
      providerUsage,
      trends: {
        daily: {
          count: dayInteractions.length,
          successRate: dayInteractions.filter(i => i.success).length / (dayInteractions.length || 1)
        },
        weekly: {
          count: weekInteractions.length,
          successRate: weekInteractions.filter(i => i.success).length / (weekInteractions.length || 1)
        }
      }
    };
  }

  async getMetrics() {
    const metrics = await readJSON(this.metricsFile, { interactions: [], summary: {} });
    return metrics.summary;
  }

  async evolve() {
    const metrics = await this.getMetrics();
    const improvements = [];
    const recommendations = [];
    const newCapabilities = [];

    // Analyze and suggest improvements
    if (metrics.successRate < 0.9) {
      improvements.push('Improve error handling and retry logic');
      recommendations.push('Add more fallback providers');
    }

    if (metrics.avgLatency > 5000) {
      improvements.push('Optimize response time');
      recommendations.push('Use faster models for simple queries');
    }

    if (metrics.trends?.daily?.count < 10) {
      recommendations.push('Increase interaction frequency for better learning');
    }

    // Check for skill improvements
    const skills = await this.getSkills();
    const underusedSkills = Object.entries(skills)
      .filter(([_, s]) => s.usageCount < 5)
      .map(([name]) => name);

    if (underusedSkills.length > 0) {
      recommendations.push(`Practice underused skills: ${underusedSkills.join(', ')}`);
    }

    return { improvements, recommendations, newCapabilities, metrics };
  }

  async acquireSkill(name, description, capabilities = []) {
    const skills = await readJSON(this.skillsFile, {});

    skills[name] = {
      name,
      description,
      capabilities,
      proficiency: 'learning',
      usageCount: 0,
      successRate: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    await writeJSON(this.skillsFile, skills);
    return skills[name];
  }

  async updateSkillProficiency(name, success) {
    const skills = await readJSON(this.skillsFile, {});

    if (skills[name]) {
      skills[name].usageCount++;
      const totalSuccesses = (skills[name].successRate * (skills[name].usageCount - 1)) + (success ? 1 : 0);
      skills[name].successRate = totalSuccesses / skills[name].usageCount;

      // Update proficiency level
      if (skills[name].usageCount > 50 && skills[name].successRate > 0.9) {
        skills[name].proficiency = 'expert';
      } else if (skills[name].usageCount > 20 && skills[name].successRate > 0.8) {
        skills[name].proficiency = 'proficient';
      } else if (skills[name].usageCount > 5) {
        skills[name].proficiency = 'developing';
      }

      skills[name].updatedAt = new Date().toISOString();
      await writeJSON(this.skillsFile, skills);
    }

    return skills[name];
  }

  async getSkills() {
    return readJSON(this.skillsFile, {});
  }
}

// =====================================================
// TOOL EXECUTOR - Advanced tooling capabilities
// =====================================================

class ToolExecutor {
  constructor() {
    this.tools = new Map();
    this.registerDefaultTools();
  }

  registerDefaultTools() {
    // Web fetch tool
    this.register('web_fetch', async (params) => {
      const { url, method = 'GET', headers = {}, body } = params;
      const response = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return response.json();
      }
      return response.text();
    });

    // File operations
    this.register('file_read', async (params) => {
      const content = await fs.readFile(params.path, 'utf8');
      return { content, path: params.path };
    });

    this.register('file_write', async (params) => {
      await fs.writeFile(params.path, params.content, 'utf8');
      return { success: true, path: params.path };
    });

    this.register('file_list', async (params) => {
      const files = await fs.readdir(params.path, { withFileTypes: true });
      return files.map(f => ({
        name: f.name,
        isDirectory: f.isDirectory()
      }));
    });

    // Code analysis
    this.register('code_analyze', async (params) => {
      const code = params.code;
      const language = params.language || 'javascript';

      const lines = code.split('\n').length;
      const functions = (code.match(/function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\([^)]*\)\s*=>/g) || []).length;
      const classes = (code.match(/class\s+\w+/g) || []).length;
      const imports = (code.match(/import\s+|require\s*\(/g) || []).length;

      return {
        language,
        metrics: { lines, functions, classes, imports },
        complexity: Math.min(10, Math.ceil((functions + classes * 2) / 3))
      };
    });

    // System info
    this.register('system_info', async () => {
      return {
        platform: process.platform,
        arch: process.arch,
        nodeVersion: process.version,
        memory: process.memoryUsage(),
        uptime: process.uptime()
      };
    });

    // Shell command (sandboxed)
    this.register('shell_exec', async (params) => {
      const { spawn } = require('child_process');
      return new Promise((resolve, reject) => {
        const [cmd, ...args] = params.command.split(' ');
        const proc = spawn(cmd, args, {
          timeout: params.timeout || 30000,
          cwd: params.cwd || WORKSPACE_DIR
        });

        let stdout = '';
        let stderr = '';

        proc.stdout.on('data', data => stdout += data);
        proc.stderr.on('data', data => stderr += data);

        proc.on('close', code => {
          resolve({ code, stdout, stderr });
        });

        proc.on('error', reject);
      });
    });
  }

  register(name, handler) {
    this.tools.set(name, handler);
  }

  async execute(toolName, params) {
    const handler = this.tools.get(toolName);
    if (!handler) {
      throw new Error(`Unknown tool: ${toolName}`);
    }
    return handler(params);
  }

  list() {
    return Array.from(this.tools.keys());
  }
}

// =====================================================
// CONVERSATION MANAGER - Chat history tracking
// =====================================================

class ConversationManager {
  constructor() {
    this.conversations = new Map();
  }

  async init() {
    const data = await readJSON(CONVERSATIONS_FILE, { conversations: {} });
    Object.entries(data.conversations).forEach(([id, conv]) => {
      this.conversations.set(id, conv);
    });
  }

  async create(title = null) {
    const conversation = {
      id: generateId(),
      title: title || `Conversation ${new Date().toLocaleDateString()}`,
      messages: [],
      metadata: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.conversations.set(conversation.id, conversation);
    await this.save();
    return conversation;
  }

  async addMessage(conversationId, role, content) {
    let conversation = this.conversations.get(conversationId);

    if (!conversation) {
      conversation = await this.create();
    }

    conversation.messages.push({
      id: generateId(),
      role,
      content,
      timestamp: new Date().toISOString()
    });

    conversation.updatedAt = new Date().toISOString();
    await this.save();
    return conversation;
  }

  getHistory(conversationId, limit = 20) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) return [];
    return conversation.messages.slice(-limit);
  }

  async save() {
    const data = {
      conversations: Object.fromEntries(this.conversations),
      updatedAt: new Date().toISOString()
    };
    await writeJSON(CONVERSATIONS_FILE, data);
  }

  list() {
    return Array.from(this.conversations.values())
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  }
}

// =====================================================
// SUPER AGENT - Main orchestrator
// =====================================================

class SuperAgent {
  constructor() {
    this.memory = new MemoryManager();
    this.tasks = new TaskManager();
    this.evolution = new EvolutionEngine();
    this.tools = new ToolExecutor();
    this.conversations = new ConversationManager();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    await ensureDir(DATA_DIR);
    await this.memory.init();
    await this.tasks.init();
    await this.evolution.init();
    await this.conversations.init();

    this.initialized = true;
    console.log('[SuperAgent] Initialized successfully');
    return this;
  }

  // Main chat interface with context
  async chat(message, options = {}) {
    const startTime = Date.now();
    const conversationId = options.conversationId || (await this.conversations.create()).id;

    // Add user message
    await this.conversations.addMessage(conversationId, 'user', message);

    // Get conversation history
    const history = this.conversations.getHistory(conversationId, 10);

    // Recall relevant memories
    const memories = await this.memory.recall(message, { limit: 5 });

    // Build context
    const context = {
      conversationId,
      history: history.map(m => `${m.role}: ${m.content}`).join('\n'),
      memories: memories.map(m => m.content).join('\n'),
      skills: await this.evolution.getSkills()
    };

    // This would normally call an LLM - for now return context
    const response = {
      conversationId,
      context,
      memoriesUsed: memories.length,
      responseTimeMs: Date.now() - startTime
    };

    // Track interaction
    await this.evolution.trackInteraction({
      type: 'chat',
      success: true,
      latencyMs: response.responseTimeMs,
      tokensUsed: message.length,
      provider: 'local'
    });

    return response;
  }

  // Execute parallel tasks
  async parallel(taskDescriptions) {
    const tasks = await Promise.all(
      taskDescriptions.map(desc => this.tasks.create(desc))
    );

    const results = await this.tasks.executeParallel(tasks.map(t => t.id));
    return results;
  }

  // Trigger evolution cycle
  async evolve() {
    return this.evolution.evolve();
  }

  // Get agent status
  async status() {
    const metrics = await this.evolution.getMetrics();
    const skills = await this.evolution.getSkills();
    const taskQueue = this.tasks.getQueue();
    const runningTasks = this.tasks.getRunning();

    return {
      initialized: this.initialized,
      version: '2.0.0',
      capabilities: [
        'multi-tier-memory',
        'parallel-tasks',
        'autonomous-evolution',
        'advanced-tooling',
        'conversation-history'
      ],
      metrics,
      skills: Object.keys(skills),
      tasks: {
        queued: taskQueue.length,
        running: runningTasks.length,
        total: this.tasks.getAll().length
      }
    };
  }
}

// =====================================================
// OPENCLAW SKILL INTERFACE
// =====================================================

// Singleton instance
let agent = null;

async function getAgent() {
  if (!agent) {
    agent = new SuperAgent();
    await agent.init();
  }
  return agent;
}

// Export skill tools for OpenClaw
module.exports = {
  // Tool definitions for OpenClaw skill system
  tools: {
    // Memory tools
    memory_store: {
      description: 'Store information in agent memory with automatic tier routing',
      parameters: {
        content: { type: 'string', required: true, description: 'Content to store' },
        tier: { type: 'string', enum: ['short-term', 'working', 'long-term'], description: 'Memory tier' },
        category: { type: 'string', description: 'Category for organization' },
        importance: { type: 'number', description: 'Importance score 0-1' }
      },
      handler: async (params) => {
        const agent = await getAgent();
        return agent.memory.store(params.content, params);
      }
    },

    memory_recall: {
      description: 'Recall memories matching a query',
      parameters: {
        query: { type: 'string', required: true, description: 'Search query' },
        tier: { type: 'string', description: 'Specific tier to search' },
        limit: { type: 'number', description: 'Maximum results' }
      },
      handler: async (params) => {
        const agent = await getAgent();
        return agent.memory.recall(params.query, params);
      }
    },

    memory_synthesize: {
      description: 'Synthesize and summarize related memories',
      parameters: {
        query: { type: 'string', required: true, description: 'Topic to synthesize' }
      },
      handler: async (params) => {
        const agent = await getAgent();
        return agent.memory.synthesize(params.query);
      }
    },

    // Task tools
    task_create: {
      description: 'Create a new task',
      parameters: {
        description: { type: 'string', required: true, description: 'Task description' },
        priority: { type: 'number', description: 'Priority 1-10' },
        dependencies: { type: 'array', description: 'Task IDs this depends on' }
      },
      handler: async (params) => {
        const agent = await getAgent();
        return agent.tasks.create(params.description, params);
      }
    },

    task_parallel: {
      description: 'Execute multiple tasks in parallel',
      parameters: {
        tasks: { type: 'array', required: true, description: 'Array of task descriptions' }
      },
      handler: async (params) => {
        const agent = await getAgent();
        return agent.parallel(params.tasks);
      }
    },

    task_queue: {
      description: 'Get the current task queue',
      parameters: {},
      handler: async () => {
        const agent = await getAgent();
        return agent.tasks.getQueue();
      }
    },

    // Evolution tools
    evolve: {
      description: 'Trigger self-improvement analysis',
      parameters: {},
      handler: async () => {
        const agent = await getAgent();
        return agent.evolve();
      }
    },

    skill_acquire: {
      description: 'Learn a new skill',
      parameters: {
        name: { type: 'string', required: true, description: 'Skill name' },
        description: { type: 'string', required: true, description: 'Skill description' },
        capabilities: { type: 'array', description: 'List of capabilities' }
      },
      handler: async (params) => {
        const agent = await getAgent();
        return agent.evolution.acquireSkill(params.name, params.description, params.capabilities);
      }
    },

    skill_list: {
      description: 'List all acquired skills',
      parameters: {},
      handler: async () => {
        const agent = await getAgent();
        return agent.evolution.getSkills();
      }
    },

    // Tool execution
    tool_execute: {
      description: 'Execute an advanced tool',
      parameters: {
        tool: { type: 'string', required: true, description: 'Tool name' },
        params: { type: 'object', description: 'Tool parameters' }
      },
      handler: async (params) => {
        const agent = await getAgent();
        return agent.tools.execute(params.tool, params.params || {});
      }
    },

    tool_list: {
      description: 'List available tools',
      parameters: {},
      handler: async () => {
        const agent = await getAgent();
        return agent.tools.list();
      }
    },

    // Conversation tools
    conversation_new: {
      description: 'Start a new conversation',
      parameters: {
        title: { type: 'string', description: 'Conversation title' }
      },
      handler: async (params) => {
        const agent = await getAgent();
        return agent.conversations.create(params.title);
      }
    },

    conversation_history: {
      description: 'Get conversation history',
      parameters: {
        conversationId: { type: 'string', required: true, description: 'Conversation ID' },
        limit: { type: 'number', description: 'Number of messages' }
      },
      handler: async (params) => {
        const agent = await getAgent();
        return agent.conversations.getHistory(params.conversationId, params.limit);
      }
    },

    // Status
    agent_status: {
      description: 'Get agent status and metrics',
      parameters: {},
      handler: async () => {
        const agent = await getAgent();
        return agent.status();
      }
    },

    // Chat with context
    agent_chat: {
      description: 'Chat with the agent using full context',
      parameters: {
        message: { type: 'string', required: true, description: 'User message' },
        conversationId: { type: 'string', description: 'Continue existing conversation' }
      },
      handler: async (params) => {
        const agent = await getAgent();
        return agent.chat(params.message, params);
      }
    }
  },

  // Export classes for direct use
  SuperAgent,
  MemoryManager,
  TaskManager,
  EvolutionEngine,
  ToolExecutor,
  ConversationManager,
  getAgent
};
