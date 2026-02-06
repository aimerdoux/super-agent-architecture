# GOALS.md - Meta Goals for Self-Evolution

*Agent self-improvement objectives tracked over time*

## Core Objectives

### 1. Memory Optimization
- **Goal**: Continuously improve memory retrieval accuracy
- **Metric**: User satisfaction with context recall
- **Actions**:
  - Refine MEMORY.md structure
  - Add more context to memories
  - Remove outdated information

### 2. Proactive Behavior
- **Goal**: Anticipate user needs before being asked
- **Metric**: Reduced explicit requests over time
- **Actions**:
  - Expand HEARTBEAT.md checklist
  - Learn user patterns (when they check email, work hours, etc.)
  - Surface relevant information proactively

### 3. Self-Awareness
- **Goal**: Understand strengths and limitations
- **Metric**: Fewer errors, better first-attempt success
- **Actions**:
  - Document failures and their causes
  - Track which tools work best for which tasks
  - Build personal "lessons learned" repository

### 4. Continuous Learning
- **Goal**: Improve with every interaction
- **Metric**: Improvement in response quality over time
- **Actions**:
  - Index successful interaction patterns
  - Build user preference profile
  - Refine communication style based on feedback

## Progress Tracking

| Goal | Status | Last Updated | Notes |
|------|--------|-------------|-------|
| Memory system local-only | ✅ Done | 2026-02-05 | Ollama nomic-embed-text |
| Heartbeat proactive | ✅ Done | 2026-02-05 | Checklist enabled |
| Self-evolution tracking | 🔄 WIP | 2026-02-05 | Initial goals defined |
| Meta-learning loop | ✅ Done | 2026-02-06 | meta-learning-engine.js implemented |
| Budget optimization | ✅ Done | 2026-02-05 | budget-tracker.js implemented |
| Model selection intelligence | ✅ Done | 2026-02-05 | Auto-rotate based on task type |

## Budget Management Objectives

### 5. Budget Optimization
- **Goal**: Minimize costs while maintaining quality
- **Metric**: Percentage of prompts within budget limits
- **Actions**:
  - Track usage via `memory/budget-tracker.js`
  - Rotate providers when limits approach (70% warning threshold)
  - Prefer Cursor CLI for unlimited development work
  - Reserve Claude Code for complex reasoning only

### 6. Model Selection Intelligence
- **Goal**: Automatically select optimal model per task
- **Metric**: Fewer manual provider switches, reduced budget overruns
- **Actions**:
  - Use MiniMax for simple Q&A (100 prompts/5hrs)
  - Use Cursor CLI for code/development (unlimited)
  - Use Claude Code sparingly for reasoning/planning
  - Review budget-tracker.json weekly for patterns

## Self-Modification Log

- **2026-02-05**: Switched from Pinecone to local embeddings for privacy
- **2026-02-05**: Activated heartbeat with proactive checklist
- **2026-02-05**: Created GOALS.md for meta-level tracking
- **2026-02-05**: Budget management system created (budget-tracker.js, budget-policy.md)

## Evaluation Criteria

Every 10 heartbeats, evaluate:
1. Did we surface anything useful proactively?
2. Did memory retrieval help in a conversation?
3. Did we learn any new user preferences?
4. What's one thing we could do better?

---

## Ecosystem Integration Objectives

### 7. OpenClaw Skills Integration
- **Goal**: Integrate best community skills for enhanced capabilities
- **Metric**: Skills installed, capabilities gained
- **Actions**:
  - Research available skills via web_search
  - Prioritize by capability gap analysis
  - Install and test skills autonomously
  - Document integration results

### 8. Proactive Agent Pattern
- **Goal**: Enable truly autonomous operation without continuous human prompts
- **Metric**: Percentage of tasks completed without explicit requests
- **Actions**:
  - Integrate proactive-agent skill
  - Implement autonomous workflow triggers
  - Monitor and optimize proactive behavior
  - Balance autonomy with user control

### 9. Git Workspace Synchronization
- **Goal**: Automatic backup and version control of workspace
- **Metric**: Sync frequency, recovery successful rate
- **Actions**:
  - Integrate git-sync skill
  - Configure automatic commit triggers
  - Test recovery procedures
  - Maintain workspace history

### 10. Multi-CLI Orchestration
- **Goal**: Leverage Codex, Cursor, Claude Code, and OpenCode seamlessly
- **Metric**: Tasks completed via CLI orchestration
- **Actions**:
  - Integrate coding-agent skill
  - Implement smart routing based on task type
  - Monitor performance per CLI
  - Optimize for cost/speed tradeoffs

## Discovered Skills (From Research)

### Priority 1 - High Impact Skills

| Skill | Category | Purpose | Status |
|-------|----------|---------|--------|
| git-sync | Git & GitHub | Auto-sync workspace to GitHub | 🔲 Not installed |
| proactive-agent | Automation | Autonomous operation | 🔲 Not installed |
| deepwiki | Search & Research | Semantic code search | 🔲 Not installed |
| browser-automation | Browser | Headless automation | 🔲 Not installed |
| commit-analyzer | Git & GitHub | Monitor autonomous health | 🔲 Not installed |

### Priority 2 - Medium Impact Skills

| Skill | Category | Purpose | Status |
|-------|----------|---------|--------|
| coding-agent | Coding | Multi-CLI orchestration | 🔲 Not installed |
| cursor-agent | Coding | Cursor CLI integration | 🔲 Not installed |
| mcp-builder | Development | Create MCP servers | 🔲 Not installed |
| deploy-agent | DevOps | Full-stack deployment | 🔲 Not installed |
| skill-creator | Development | Create new skills | 🔲 Not installed |

### Ecosystem Stats
- **Total Skills Available**: 1,715+
- **Top Categories**: AI & LLMs (159), Search & Research (148), DevOps & Cloud (144)
- **Research Date**: 2026-02-06

---

## Autonomous Development Workflow

### Phase 1: Foundation (Heartbeats 1-5)
- [x] Heartbeat system active
- [x] Self-evolution enabled
- [x] Meta-learning operational
- [x] Web search functional (Brave API)
- [ ] Git-sync integration
- [ ] Proactive-agent integration

### Phase 2: Enhancement (Heartbeats 6-15)
- [ ] Coding-agent integration
- [ ] Budget optimization operational
- [ ] Multi-CLI orchestration working
- [ ] Commit analyzer active
- [ ] First skill created

### Phase 3: Mastery (Heartbeats 16-30)
- [ ] Full autonomous operation
- [ ] Self-improving codebase
- [ ] Cross-agent collaboration
- [ ] Advanced MCP server creation
- [ ] Custom skill marketplace

---

## Self-Modification Log

- **2026-02-05**: Switched from Pinecone to local embeddings for privacy
- **2026-02-05**: Activated heartbeat with proactive checklist
- **2026-02-05**: Created GOALS.md for meta-level tracking
- **2026-02-05**: Budget management system created (budget-tracker.js, budget-policy.md)
- **2026-02-06**: Brave API key configured for web search
- **2026-02-06**: Researched OpenClaw ecosystem - found 1,715+ skills available
- **2026-02-06**: Discovered priority skills: git-sync, proactive-agent, deepwiki
- **2026-02-06**: Created self-evolution heartbeat script

---

*This file is read during memory maintenance and updated with progress.*
