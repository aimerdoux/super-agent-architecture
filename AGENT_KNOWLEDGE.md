# Agent Knowledge Base - Session Context

## Session Summary (2026-02-01)
**Goal**: Build a self-evolving, personalized, multi-task agent with minimal API keys (max 10).

**User**: +13054965876 (WhatsApp)
**Session Start**: 2026-02-01 16:20:27 EST

## Key Decisions Made

### API Key Strategy
- **Minimal external dependencies**: Use local Ollama instead of OpenAI for embeddings
- **Only essential cloud service**: Pinecone for vector memory
- **Budget**: Maximum 10 API keys across entire project

### Architecture Choices
1. **Memory**: Pinecone RAG with Ollama embeddings (nomic-embed-text)
2. **Skills**: Extendable via OpenClaw skill system
3. **Self-improvement**: Heartbeat-based loops
4. **Browser**: OpenClaw's built-in browser tool (existing)

### Pinecone Configuration
- Index: `clawdoux`
- Environment: `us-west1-gcp`
- Embedding Model: nomic-embed-text (768 dimensions)
- Embedding Service: Ollama (local, http://localhost:11434)

## Skills Created

### pinecone-memory
**Location**: `C:\Users\play4\AppData\Roaming\npm\node_modules\openclaw\skills\pinecone-memory`

**Tools**:
1. `memory_index` - Store text with embedding in Pinecone
2. `memory_recall` - Search for semantically similar memories
3. `memory_summary` - Extract key points from transcripts and index them

**Dependencies**:
- @pinecone-database/pinecone (Pinecone SDK)
- Ollama for embeddings (no API key, local)

## Files Created/Modified

| File | Purpose |
|------|---------|
| `SETUP.md` | Reproducible setup guide |
| `skills/pinecone-memory/index.js` | RAG implementation |
| `skills/pinecone-memory/package.json` | Dependencies |
| `skills/pinecone-memory/SKILL.md` | Skill documentation |

## Conversation Log (Key Points)

### Initial Request (16:20:27)
User proposed 4 features:
1. Proactive agent with self-triggered actions
2. Self-improve agent
3. Browser use (connect to internet)
4. Agent browser

### API Strategy Discussion (16:33-16:35)
- User provided Pinecone API key: `pcsk_3vcgcX_Q4VziHP7A8pGRhaCAPeFgro2jAUCJrVTArQQMBpDFM3ujeeUgefyAhsqq3TWXdp`
- Decided to avoid OpenAI due to API key budget constraints
- Chose Ollama local embeddings instead

### Documentation Priority (16:35:23)
- User emphasized documenting everything for RAG context
- Current session, logs, and code will be indexed
- Goal: Reproducible from scratch using documentation

## Skills Created

### pinecone-memory ✅ READY
**Location**: `...openclaw\skills\pinecone-memory`
**Tools**: memory_index, memory_recall, memory_summary
**Dependencies**: @pinecone-database/pinecone, Ollama (local)

### proactive-agent ⏳ IN PROGRESS
**Purpose**: Self-triggered autonomous actions (schedules, conditions, events)
**Tools**: trigger_add, trigger_remove, trigger_list, trigger_check, action_execute

### self-improve-agent ⏳ IN PROGRESS
**Purpose**: Reflection, code review, memory distillation
**Tools**: reflect, review_code, distill_memory, set_goals

### browser-agent ⏳ IN PROGRESS
**Purpose**: Autonomous web navigation & research
**Tools**: navigate_and_summarize, search_web, extract_content, complete_task

## Configuration Status

### OpenClaw Config (openclaw.json)
- pinecone-memory: ✅ Configured with credentials
- Other skills: ⏳ Pending configuration

## API Key Usage (Budget: ≤10)

| # | Service | Purpose | Status |
|---|---------|---------|--------|
| 1 | Pinecone | Vector memory | ✅ Active |
| 2-10 | Reserved | Future needs | TBD |

**Key Savings**: Using Ollama (local) instead of OpenAI saves 1+ API keys

## User Preferences

- **Privacy-first**: Local Ollama over cloud AI
- **Reproducible**: Everything documented
- **Minimal APIs**: Max 10 keys total
- **Self-evolving**: Agent improves through memory and reflection

## Technical Notes

### Ollama Setup
```bash
# Model for embeddings
ollama pull nomic-embed-text

# Endpoint
http://localhost:11434/api/embed
```

### Pinecone Index Specs
- Index Name: clawdoux
- Dimension: 768
- Metric: cosine

### Session Transcripts
- `C:\Users\play4\.openclaw\agents\main\sessions\dcb90d4d-7532-430c-993e-1f25085beb68.jsonl` (first session)
- `C:\Users\play4\.openclaw\agents\main\sessions\f28bad96-04bc-493f-b40c-d8acf5ddda07.jsonl` (second session)
