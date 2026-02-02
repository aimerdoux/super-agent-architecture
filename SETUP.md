# Super Agent Setup Guide

Complete setup instructions for the Super Agent system.

---

## 📋 Prerequisites

### Required Software
- **Node.js**: Version 22+ (check with `node --version`)
- **Git**: Latest version
- **Modern Browser**: Chrome/Edge/Firefox/Safari
- **Ollama** (optional): For local embeddings

### Optional Services
- **Pinecone Account**: For long-term vector memory
- **GitHub Account**: For repository integration
- **OpenAI API Key**: Fallback for embeddings
- **Ollama**: Free local embeddings (recommended)

---

## 🚀 Installation Steps

### Step 1: Install OpenClaw

```bash
# Global install via npm
npm install -g openclaw@latest

# Verify installation
openclaw --version
```

### Step 2: Run Onboarding Wizard

```bash
# Start the onboarding process
openclaw onboard --install-daemon
```

The wizard will guide you through:
1. Gateway setup (local server)
2. Channel connections (WhatsApp, Telegram, etc.)
3. Model configuration
4. Skills selection
5. Security settings

### Step 3: Start the Gateway

```bash
# Start the gateway service
openclaw gateway start

# Check status
openclaw gateway status

# View dashboard
# Open: http://127.0.0.1:18789/
```

### Step 4: Connect Your Channels

```bash
# WhatsApp (shows QR code)
openclaw channels login whatsapp

# Telegram
openclaw channels login telegram

# Discord
openclaw channels login discord
```

### Step 5: Configure Models

#### Option A: MiniMax (Primary - Recommended)
MiniMax is already configured as the default model.

#### Option B: Add Anthropic Claude
```bash
openclaw configure --section anthropic
# Enter your API key when prompted
```

#### Option C: Add OpenAI GPT-4
```bash
openclaw configure --section openai
# Enter your API key when prompted
```

#### Option D: Local Ollama (Privacy-First)
```bash
# Install Ollama
winget install Ollama.Ollama

# Pull embedding model
ollama pull nomic-embed-text

# Start Ollama server
ollama serve
```

### Step 6: Configure Memory (Pinecone)

1. Create a free Pinecone account: https://pinecone.io
2. Create a new index:
   - Name: `clawdoux` (or your preferred name)
   - Dimension: 768 (for nomic-embed-text)
   - Metric: Cosine
3. Get your API key from the console
4. Configure OpenClaw:

```bash
openclaw configure --section pinecone
# Enter: API key, environment, index name
```

Or manually edit `~/.openclaw/openclaw.json`:

```json
{
  "skills": {
    "entries": {
      "pinecone-memory": {
        "enabled": true,
        "apiKey": "pcsk_xxx",
        "config": {
          "environment": "us-west1-gcp",
          "indexName": "clawdoux"
        }
      }
    }
  }
}
```

### Step 7: Connect Browser Relay

For advanced browser automation:

1. Install OpenClaw Chrome extension
2. Click the extension icon in Chrome
3. Toggle "Connect" to attach the current tab

---

## 🛠️ Configuration

### File Location
`~/.openclaw/openclaw.json` (Windows)
`$HOME/.openclaw/openclaw.json` (Mac/Linux)

### Complete Configuration Example

```json
{
  "channels": {
    "whatsapp": {
      "enabled": true,
      "allowFrom": ["+1234567890"]
    },
    "telegram": {
      "enabled": true
    },
    "discord": {
      "enabled": false
    }
  },
  "models": {
    "default": "minimax/MiniMax-M2.1",
    "fallback": "anthropic/claude-sonnet-4-20250514"
  },
  "skills": {
    "entries": {
      "memory-manager": { "enabled": true },
      "pinecone-memory": { "enabled": true },
      "proactive-agent": { "enabled": true },
      "trigger-orchestrator": { "enabled": true },
      "browser-agent": { "enabled": true },
      "browser-mastery": { "enabled": true },
      "code-super": { "enabled": true },
      "meta-cognition": { "enabled": true },
      "research-agent": { "enabled": true },
      "api-integrator": { "enabled": true },
      "document-generator": { "enabled": true }
    }
  },
  "gateway": {
    "port": 18789,
    "auth": {
      "mode": "token"
    }
  },
  "browser": {
    "enabled": true,
    "relay": {
      "port": 18792
    }
  }
}
```

---

## 🔧 Environment Variables

Create a `.env` file in your workspace:

```bash
# Core
OPENCLAW_Workspace=C:\Users\play4\.openclaw\workspace

# API Keys (optional)
PINECONE_API_KEY=pcsk_xxx
OPENAI_API_KEY=sk-xxx
ANTHROPIC_API_KEY=sk-ant-xxx

# Local Models
OLLAMA_HOST=http://localhost:11434

# GitHub (for code generation)
GITHUB_TOKEN=ghp_xxx
```

---

## ✅ Verification

### Test Your Setup

```bash
# Check gateway status
openclaw gateway status

# Test chat
openclaw agent --message "Hello, are you there?"

# List available skills
openclaw skills list

# Run system test
node test-super-agent.js
```

### Expected Output

```
✅ Gateway running on port 18789
✅ All 66+ skills loaded
✅ Channels connected
✅ Super Agent ready!
```

---

## 🎯 First Tasks to Try

### 1. Basic Chat
> "Hi! What's your name and what can you do?"

### 2. Memory Test
> "Remember that I prefer to be addressed as 'Boss'"

### 3. Code Generation
> "Build a simple REST API for a todo list in Node.js"

### 4. Research Task
> "Research the latest developments in AI agents and summarize"

### 5. Browser Automation
> "Search for OpenClaw documentation and summarize the installation steps"

### 6. Scheduling
> "Remind me to take a break every hour"

---

## 🔧 Troubleshooting

### Gateway Won't Start
```bash
# Kill any existing processes
openclaw gateway stop

# Restart
openclaw gateway start --verbose

# Check logs
openclaw doctor
```

### Channels Not Connecting
```bash
# Re-authenticate
openclaw channels logout whatsapp
openclaw channels login whatsapp

# Check network
ping whatsapp.com
```

### Memory Not Working
```bash
# Verify Pinecone config
openclaw configure --section pinecone

# Test connection
node -e "require('@pinecone-database/pinecone')"
```

### Browser Not Responding
```bash
# Restart browser relay
openclaw browser stop
openclaw browser start

# Reattach tab
# Click OpenClaw extension → Connect
```

### Model Errors
```bash
# Check API keys
openclaw configure --section model

# View provider status
openclaw models status
```

---

## 📚 Next Steps

1. **Read the Skills Guide** → `SKILLS.md`
2. **Explore the Architecture** → `README.md`
3. **Run the System Test** → `node test-super-agent.js`
4. **Customize Configuration** → `~/.openclaw/openclaw.json`
5. **Add Your Skills** → `workspace/skills/`

---

## 🆘 Getting Help

- **Documentation**: https://docs.openclaw.ai
- **Issues**: GitHub Issues
- **Discord**: OpenClaw Discord community
- **Email**: Support email (if configured)

---

*Last Updated: 2026-02-02*
*Version: 1.0.0*
