# Super Agent Skills Reference

Complete documentation of all skills available in the Super Agent system.

---

## 📋 Skills by Category

### 🔮 Memory Skills

#### memory-manager
**Path:** `skills/memory-manager/`
**Description:** Multi-tier intelligent memory orchestration
**Tools:**
- `memory_store` - Auto-route to appropriate tier
- `memory_recall` - Retrieve with similarity scoring
- `memory_synthesize` - Combine related memories
- `memory_prune` - Remove expired/low-value memories
- `memory_optimize` - Reorganize working memory
- `memory_status` - Show statistics for all tiers

**Smart Routing:**
- **short-term**: Urgent/ephemeral (session cache)
- **working**: Context-critical (24-hour optimized)
- **long-term**: Important/long-lasting (Pinecone)

#### pinecone-memory
**Path:** `skills/pinecone-memory/`
**Description:** RAG memory with Ollama embeddings (no OpenAI key needed!)
**Tools:**
- `memory_index` - Store text with semantic embedding
- `memory_recall` - Search with semantic similarity
- `memory_summary` - Extract and index key points

**Configuration:**
```json
{
  "skills": {
    "pinecone-memory": {
      "apiKey": "pcsk_xxx",
      "environment": "us-west1-gcp",
      "indexName": "clawdoux"
    }
  }
}
```

#### self-improve-agent
**Path:** `skills/self-improve-agent/`
**Description:** Reflection, code review, and improvement
**Tools:**
- `reflect` - Analyze recent performance
- `review_code` - Review code for improvements
- `distill_memory` - Consolidate learnings
- `set_goals` - Set improvement goals

---

### ⚡ Proactive Skills

#### proactive-agent
**Path:** `skills/proactive-agent/`
**Description:** Self-triggered autonomous actions
**Tools:**
- `trigger_add` - Add new trigger
- `trigger_remove` - Remove trigger
- `trigger_list` - List all triggers
- `trigger_check` - Evaluate triggers
- `action_execute` - Execute action directly

**Trigger Types:**
- **Schedule**: Cron-like schedules
- **Condition**: Expression-based triggers
- **Event**: Event-based triggers

#### trigger-orchestrator
**Path:** `skills/trigger-orchestrator/`
**Description:** Complex multi-trigger coordination
**Tools:**
- `trigger_coordinate` - Topological sorting, parallel execution
- `trigger_predict` - Pattern-based predictions
- `trigger_adapt` - Adaptive scheduling
- `trigger_orchestrate` - Multi-stage workflows
- `trigger_recovery` - Retry with exponential backoff
- `trigger_cost_optimizer` - Budget tracking
- `trigger_list_advanced` - Filtered listing with stats

---

### 🌐 Browser Skills

#### browser-agent
**Path:** `skills/browser-agent/`
**Description:** Autonomous web navigation and research
**Tools:**
- `navigate_and_summarize` - Navigate and extract info
- `search_web` - Web search with results
- `extract_content` - Scrape specific content
- `complete_task` - Multi-step browser tasks

#### browser-mastery
**Path:** `skills/browser-mastery/`
**Description:** Advanced browser automation with anti-detection
**Tools:**
- `browser_multi_tab` - Open/manage tabs
- `browser_form_auto` - Auto-fill forms
- `browser_session_manager` - Save/load sessions
- `browser_human_simulator` - Human-like behavior
- `browser_anti_detect` - Stealth mode
- `browser_parallel_task` - Concurrent tasks
- `browser_data_extractor` - Structured extraction

**Anti-Detection Features:**
- Random delays (30-120ms typing)
- Human-like scrolling with curves
- Mouse movement randomization
- Canvas/WebGL fingerprint noise
- User-agent rotation

#### browser-interact
**Path:** `skills/browser-interact/`
**Description:** Gate bypassing and interaction
**Tools:**
- `bypass_gate` - Bypass common gate patterns
- `browser_interact` - Complex interactions
- `extract_video_info` - Video metadata extraction
- `watch_and_summarize` - Video summarization

---

### 💻 Code Skills

#### coding-agent
**Path:** `skills/coding-agent/`
**Description:** Code generation via Codex/Claude/Pi
**Usage:**
```bash
# With PTY (required!)
bash pty:true workdir:~/project command:"codex exec 'Build a dark mode toggle'"

# Background mode
bash pty:true workdir:~/project background:true command:"codex --yolo 'Refactor auth module'"
```

#### code-super
**Path:** `skills/code-super/`
**Description:** Full-stack code generation and deployment
**Tools:**
- `code_generate` - Generate code from requirements
- `code_test_generate` - Auto-generate tests
- `code_security_scan` - Vulnerability scanning
- `code_performance_analyze` - Optimization analysis
- `code_document` - Generate documentation
- `code_refactor` - Intelligent refactoring
- `code_deploy` - CI/CD pipeline generation
- `code_review_advanced` - Deep code review

#### github
**Path:** `skills/github/`
**Description:** GitHub CLI integration
**Usage:**
```bash
gh pr checks --repo owner/repo
gh run list --repo owner/repo --limit 10
gh api repos/owner/repo/pulls/55 --jq '.title, .state'
```

---

### 🧠 Meta-Cognition Skills

#### meta-cognition
**Path:** `skills/meta-cognition/`
**Description:** Self-modeling, prediction, and autonomous improvement
**Tools:**
- `meta_monitor` - Track performance metrics
- `meta_predict` - Predict task outcomes
- `meta_optimize` - Suggest improvements
- `meta_strategy_select` - Recommend approaches
- `meta_heuristic_improve` - Derive decision rules
- `meta_failure_prevent` - Generate prevention strategies
- `meta_skill_acquire` - Track new capabilities

**Metrics Stored:** `memory/meta-cognition.json`

---

### 📚 Research Skills

#### research-agent
**Path:** `skills/research-agent/`
**Description:** Deep research and knowledge synthesis
**Tools:**
- `research_deep` - Comprehensive research
- `research_synthesize` - Combine findings
- `source_credibility` - Score source quality
- `research_monitor` - Track topics over time
- `knowledge_graph_build` - Build knowledge graphs
- `hypothesis_generate` - Generate/test hypotheses

#### summarize
**Path:** `skills/summarize/`
**Description:** Content summarization

---

### 🔗 API Skills

#### api-integrator
**Path:** `skills/api-integrator/`
**Description:** External API orchestration
**Tools:**
- `api_call` - Intelligent API calls with retry
- `api_orchestrate` - Multi-API coordination
- `api_webhook` - Webhook configuration
- `api_rate_limit` - Rate limit monitoring
- `api_oauth_flow` - OAuth authentication

**Providers:** OpenAI, Pinecone, GitHub, Slack, Discord, Supabase, Custom

#### weather
**Path:** `skills/weather/`
**Description:** Weather data (no API key required!)
**Services:** wttr.in (primary), Open-Meteo (fallback)

#### github
**Path:** `skills/github/`
**Description:** GitHub integration (documented above)

---

### 📝 Document Skills

#### document-generator
**Path:** `skills/document-generator/`
**Description:** Reports, emails, presentations
**Tools:**
- `doc_generate` - Generate from templates
- `doc_report` - Comprehensive reports
- `doc_email` - Professional emails
- `doc_presentation` - Presentation outlines
- `doc_api_docs` - API documentation
- `doc_summarize` - Document summarization

---

### 🧩 Productivity Skills

#### calendar (via proactive-agent)
- Cron-based scheduling
- Event triggers

#### notes
- Obsidian integration
- Notion integration
- Apple Notes

#### tasks
- Task management
- Goal tracking

#### reminders
- Apple Reminders
- Things (macOS)

---

## 📊 Skill Statistics

| Category | Count | Key Skills |
|----------|-------|------------|
| Memory | 3 | memory-manager, pinecone-memory, self-improve-agent |
| Proactive | 2 | proactive-agent, trigger-orchestrator |
| Browser | 3 | browser-agent, browser-mastery, browser-interact |
| Code | 3 | coding-agent, code-super, github |
| Meta-Cognition | 2 | meta-cognition, self-improve-agent |
| Research | 2 | research-agent, summarize |
| API | 3 | api-integrator, weather, github |
| Document | 1 | document-generator |
| Productivity | 10+ | calendar, notes, tasks, reminders, etc. |

**Total Skills: 66+**

---

## 🔧 Configuration

### Skill Enable/Disable

```json
{
  "skills": {
    "entries": {
      "memory-manager": { "enabled": true },
      "browser-mastery": { "enabled": true },
      "code-super": { "enabled": true },
      "meta-cognition": { "enabled": true }
    }
  }
}
```

### Skill Parameters

```json
{
  "skills": {
    "entries": {
      "pinecone-memory": {
        "enabled": true,
        "apiKey": "${PINECONE_API_KEY}",
        "config": {
          "environment": "us-west1-gcp",
          "indexName": "clawdoux"
        }
      }
    }
  }
}
```

---

## 🎯 Usage Examples

### Memory
```javascript
// Store important information
await memory_store({
  text: "User prefers dark mode",
  metadata: { category: "preference", priority: "high" }
});

// Recall relevant context
await memory_recall({
  query: "What are user's preferences?",
  topK: 5
});
```

### Proactive
```javascript
// Schedule daily briefing
await trigger_add(
  "daily-briefing",
  "schedule",
  { cron: "0 8 * * *" },
  { type: "notify", message: "Good morning! Your briefing is ready." },
  true
);
```

### Browser
```javascript
// Bypass gate and extract
await browser_anti_detect({ action: "apply_stealth" });
await browser_data_extractor({
  action: "extract",
  selectors: { title: "h1", content: ".main" },
  format: "json"
});
```

### Code
```javascript
// Generate and deploy
await code_generate({
  requirements: "Build a REST API for users",
  language: "typescript"
});
await code_test_generate({ codeId: "result.id" });
await code_deploy({ codeId: "result.id", environment: "production" });
```

### Meta-Cognition
```javascript
// Check performance
await meta_monitor({ timeRange: "last week" });

// Predict task
await meta_predict({ task: "Build a web app" });

// Self-improve
await meta_optimize({ basedOn: "recent performance" });
```

---

*Last Updated: 2026-02-02*
*Version: 1.0.0*
