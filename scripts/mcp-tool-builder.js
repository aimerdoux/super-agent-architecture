/**
 * MCP Tool Builder
 * Transforms GitHub repos into usable MCP tools for Claude Code integration
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const https = require('https');

// Configuration
const CONFIG = {
  toolsDir: path.join(__dirname, '..', 'mcp-tools'),
  registryFile: path.join(__dirname, '..', 'state', 'mcp-registry.json'),
  installDir: path.join(__dirname, '..', 'mcp-installed'),
};

/**
 * Known MCP Tool Repositories
 */
const KNOWN_MCP_TOOLS = [
  {
    name: 'elevenlabs-mcp',
    repo: 'simonsanvil/elevenlabs-mcp',
    description: 'ElevenLabs voice AI integration for text-to-speech',
    category: 'voice',
    install: 'npm install -g elevenlabs-mcp',
    requires: ['elevenlabs_api_key']
  },
  {
    name: 'video-transcription',
    repo: 'agentic-data/video-transcription-mcp',
    description: 'Video transcription using AI models',
    category: 'media',
    install: 'pip install video-transcription-mcp',
    requires: ['openai_api_key']
  },
  {
    name: 'firecrawl-mcp',
    repo: 'mendable/firecrawl-mcp',
    description: 'Web scraping and crawling for LLMs',
    category: 'web',
    install: 'npm install -g @mendable/firecrawl-mcp-server',
    requires: ['firecrawl_api_key']
  },
  {
    name: 'notion-mcp',
    repo: 'hendricksond/notion-mcp',
    description: 'Notion integration for notes and databases',
    category: 'productivity',
    install: 'npm install -g notion-mcp',
    requires: ['notion_token', 'notion_database_id']
  },
  {
    name: 'github-mcp-server',
    repo: 'github/github-mcp-server',
    description: 'GitHub official MCP server for PRs, issues, repos',
    category: 'development',
    install: 'docker run -i --rm -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server',
    requires: ['github_token']
  },
  {
    name: 'memory-mcp',
    repo: 'modelcontextprotocol/server-memory',
    description: 'Persistent memory for LLM conversations',
    category: 'memory',
    install: 'pip install mcp-server-memory',
    requires: []
  },
  {
    name: 'filesystem-mcp',
    repo: 'modelcontextprotocol/servers',
    description: 'File system operations for Claude',
    category: 'filesystem',
    install: 'pip install mcp-server-filesystem',
    requires: ['allowed_paths']
  },
  {
    name: 'postgres-mcp',
    repo: 'modelcontextprotocol/servers',
    description: 'PostgreSQL database operations',
    category: 'database',
    install: 'pip install mcp-server-postgres',
    requires: ['database_url']
  },
  {
    name: 'puppeteer-mcp',
    repo: 'modelcontextprotocol/servers',
    description: 'Browser automation via Puppeteer',
    category: 'browser',
    install: 'pip install mcp-server-puppeteer',
    requires: ['browser_binary_path']
  },
  {
    name: 'sequential-thinking',
    repo: 'modelcontextprotocol/servers',
    description: 'Advanced reasoning and thinking patterns',
    category: 'reasoning',
    install: 'pip install mcp-server-sequential-thinking',
    requires: []
  }
];

/**
 * MCP Tool Registry
 */
class MCPToolRegistry {
  constructor() {
    this.tools = this.loadRegistry();
  }

  loadRegistry() {
    if (fs.existsSync(CONFIG.registryFile)) {
      return JSON.parse(fs.readFileSync(CONFIG.registryFile, 'utf-8'));
    }
    return {
      available: [],
      installed: [],
      favorites: []
    };
  }

  saveRegistry() {
    fs.writeFileSync(CONFIG.registryFile, JSON.stringify(this.tools, null, 2));
  }

  async discover() {
    console.log('🔍 Discovering MCP tools from GitHub...');
    
    // Add known tools
    for (const tool of KNOWN_MCP_TOOLS) {
      if (!this.tools.available.find(t => t.name === tool.name)) {
        this.tools.available.push({
          ...tool,
          source: 'known',
          discoveredAt: new Date().toISOString()
        });
      }
    }

    // Search GitHub for MCP servers
    try {
      const searchResults = await this.searchGitHub('topic:mcp-server language:typescript');
      
      for (const repo of searchResults) {
        if (!this.tools.available.find(t => t.repo === repo.full_name)) {
          this.tools.available.push({
            name: repo.name,
            repo: repo.full_name,
            description: repo.description || 'MCP server',
            category: 'discovered',
            install: `git clone ${repo.clone_url}`,
            source: 'github',
            stars: repo.stargazers_count,
            discoveredAt: new Date().toISOString()
          });
        }
      }
    } catch (error) {
      console.log('⚠️ GitHub search failed, using known tools only');
    }

    this.saveRegistry();
    console.log(`📦 Found ${this.tools.available.length} MCP tools`);
    
    return this.tools.available;
  }

  async searchGitHub(query) {
    const results = [];
    const perPage = 30;
    
    // Use GitHub CLI if available
    try {
      const output = execSync(
        `gh search repos "${query}" --sort=stars --limit=30 --json name,full_name,description,stargazers_count,clone_url`,
        { encoding: 'utf-8' }
      );
      return JSON.parse(output);
    } catch {
      return [];
    }
  }

  async install(toolName) {
    const tool = this.tools.available.find(t => t.name === toolName);
    
    if (!tool) {
      throw new Error(`Tool not found: ${toolName}`);
    }

    console.log(`📦 Installing ${toolName}...`);

    // Create install directory
    const installPath = path.join(CONFIG.installDir, toolName);
    if (!fs.existsSync(installPath)) {
      fs.mkdirSync(installPath, { recursive: true });
    }

    // Install based on type
    try {
      switch (tool.source) {
        case 'known':
          if (tool.install.startsWith('npm')) {
            execSync(tool.install, { stdio: 'inherit', cwd: installPath });
          } else if (tool.install.startsWith('pip')) {
            execSync(tool.install, { stdio: 'inherit' });
          } else if (tool.install.startsWith('docker')) {
            // Docker commands handled separately
            console.log('ℹ️ Docker command:', tool.install);
          }
          break;
          
        case 'github':
        case 'discovered':
          execSync(`git clone ${tool.repo} ${installPath}`, { stdio: 'inherit' });
          
          // Check for package.json
          if (fs.existsSync(path.join(installPath, 'package.json'))) {
            execSync('npm install', { stdio: 'inherit', cwd: installPath });
          }
          // Check for requirements.txt
          if (fs.existsSync(path.join(installPath, 'requirements.txt'))) {
            execSync('pip install -r requirements.txt', { stdio: 'inherit', cwd: installPath });
          }
          break;
      }

      // Add to installed list
      this.tools.installed.push({
        ...tool,
        installedAt: new Date().toISOString(),
        installPath,
        status: 'installed'
      });

      this.saveRegistry();
      console.log(`✅ ${toolName} installed successfully`);
      
      return installPath;
    } catch (error) {
      console.error(`❌ Failed to install ${toolName}:`, error.message);
      throw error;
    }
  }

  generateClaudeConfig(toolName) {
    const tool = this.tools.installed.find(t => t.name === toolName);
    
    if (!tool) {
      throw new Error(`Tool not installed: ${toolName}`);
    }

    // Generate Claude Code MCP config
    const config = {
      mcpServers: {
        [toolName]: {
          command: 'node',
          args: [path.join(tool.installPath, 'dist', 'index.js')],
          env: {}
        }
      }
    };

    // Add to main config file
    const mainConfigPath = path.join(__dirname, '..', 'state', 'claude_mcp_config.json');
    let mainConfig = {};
    
    if (fs.existsSync(mainConfigPath)) {
      mainConfig = JSON.parse(fs.readFileSync(mainConfigPath, 'utf-8'));
    }
    
    mainConfig.mcpServers = {
      ...(mainConfig.mcpServers || {}),
      ...config.mcpServers
    };
    
    fs.writeFileSync(mainConfigPath, JSON.stringify(mainConfig, null, 2));
    
    return config;
  }

  listByCategory() {
    const categories = {};
    
    for (const tool of this.tools.available) {
      const cat = tool.category || 'other';
      if (!categories[cat]) {
        categories[cat] = [];
      }
      categories[cat].push({
        name: tool.name,
        description: tool.description,
        installed: this.tools.installed.some(i => i.name === tool.name)
      });
    }
    
    return categories;
  }

  async addFavorite(toolName) {
    if (!this.tools.favorites.includes(toolName)) {
      this.tools.favorites.push(toolName);
      this.saveRegistry();
    }
  }
}

/**
 * Quick Install Commands for Popular Tools
 */
const QUICK_INSTALL = {
  'voice': {
    cmd: 'npm install -g elevenlabs-mcp',
    setup: 'Set ELEVENLABS_API_KEY in .env'
  },
  'transcription': {
    cmd: 'pip install openai-whisper ffmpeg-python',
    setup: 'Requires FFmpeg installed'
  },
  'browser': {
    cmd: 'pip install mcp-server-puppeteer',
    setup: 'Set PUPPETEER_BROWSER_PATH in .env'
  },
  'filesystem': {
    cmd: 'pip install mcp-server-filesystem',
    setup: 'Set ALLOWED_PATHS in .env'
  },
  'database': {
    cmd: 'pip install mcp-server-postgres',
    setup: 'Set DATABASE_URL in .env'
  },
  'github': {
    cmd: 'docker run -d --name github-mcp -e GITHUB_PERSONAL_ACCESS_TOKEN ghcr.io/github/github-mcp-server',
    setup: 'Set GITHUB_PERSONAL_ACCESS_TOKEN in .env'
  }
};

// CLI
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--discover')) {
    const registry = new MCPToolRegistry();
    registry.discover().then(tools => {
      console.log(`\n📦 Available MCP Tools (${tools.length}):\n`);
      const byCategory = registry.listByCategory();
      for (const [cat, list] of Object.entries(byCategory)) {
        console.log(`\n### ${cat.toUpperCase()}`);
        for (const tool of list) {
          const status = tool.installed ? '✅' : '○';
          console.log(`  ${status} ${tool.name}`);
        }
      }
    });
  }
  
  if (args.includes('--install')) {
    const toolName = args[args.indexOf('--install') + 1];
    const registry = new MCPToolRegistry();
    registry.install(toolName).then(() => {
      registry.generateClaudeConfig(toolName);
      console.log(`\n✨ ${toolName} ready for Claude Code!`);
    });
  }
  
  if (args.includes('--quick')) {
    const category = args[args.indexOf('--quick') + 1];
    const info = QUICK_INSTALL[category];
    if (info) {
      console.log(`\n📦 Quick Install: ${category}`);
      console.log(`   Command: ${info.cmd}`);
      console.log(`   Setup: ${info.setup}`);
    }
  }
}

module.exports = {
  MCPToolRegistry,
  KNOWN_MCP_TOOLS,
  QUICK_INSTALL
};
