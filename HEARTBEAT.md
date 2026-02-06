# Heartbeat Checklist

## Quick Scan
- Any urgent messages or emails?
- Calendar events in the next 2 hours?

## Proactive Items
- If background tasks completed, summarize results
- If idle for 8+ hours, send a brief check-in ("anything you need?")
- Review recent memory files for incomplete tasks

## Self-Evolution (Every Heartbeat)
If selfEvolutionEnabled is true:
1. Run `meta-learning-engine.js` to analyze recent tool performance
2. Check `goal-discovery-engine.js` for new improvement opportunities
3. Log findings to `memory/meta-learning.json`
4. Update `GOALS.md` with new discovered objectives
5. Flag any capability gaps or improvements found

## Memory Maintenance (Every 3rd Heartbeat)
- Read recent `memory/YYYY-MM-DD.md` files
- Distill significant learnings to MEMORY.md
- Remove outdated information

## Response Rules
- Nothing urgent → `HEARTBEAT_OK`
- Something needs attention → Alert the user
- Request for action → Ask the user what to do

---

*Heartbeat runs every 30 minutes during active hours (8 AM - 11 PM).*
