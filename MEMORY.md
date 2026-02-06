# MEMORY.md - Long-Term Memory

*Last updated: 2026-02-05*

## System Architecture

- **Memory Stack**: Local markdown files + Local vector embeddings (Ollama `nomic-embed-text`)
- **Embeddings**: Ollama `nomic-embed-text` (local, no cloud dependencies)
- **Primary Model**: MiniMax-M2.1
- **Tools**: `memory_search` and `memory_get` for local semantic retrieval
- **Index Storage**: SQLite with sqlite-vec for vector acceleration

## User Preferences

- **Privacy-first**: Prefers local embeddings over cloud/Pinecone services
- **Heartbeat**: Enabled with proactive checklist for periodic awareness
- **Self-evolution**: Wants the agent to autonomously learn and improve over time
- **Platform**: Windows desktop, WhatsApp primary channel

## Important Context

- **2026-02-04**: Memory system was configured with local embeddings only (no Pinecone/cloud)
- **2026-02-05**: Heartbeat activated with proactive checklist
- Memory maintenance is performed during heartbeats to distill daily notes to long-term memory

## Memory Maintenance Protocol

During each heartbeat (every few days):
1. Read recent `memory/YYYY-MM-DD.md` files
2. Identify significant events, lessons, or insights
3. Update this file with distilled learnings
4. Remove outdated information

## Meta Goals (Self-Evolution)

- **Proactive Awareness**: Check emails, calendar, notifications periodically
- **Memory Distillation**: Convert raw daily notes into curated long-term memories
- **Continuous Improvement**: Document mistakes and solutions to avoid repetition
- **Context Accumulation**: Build rich user preference profile over time

## Lessons Learned

*(Add lessons here as they're discovered)*

---

*Update this file during heartbeats or when significant learnings occur.*
