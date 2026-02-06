# Budget Policy for Model Usage

*Usage guidelines for agents when selecting between MiniMax, Cursor CLI, and Claude Code*

---

## Overview

This policy defines when to use each AI provider based on:
- **Budget constraints** (API limits and costs)
- **Task complexity** (simple vs. complex)
- **Capabilities** (strengths of each model)

---

## Provider Tiers

### Tier 1: MiniMax (Quick Checks) ⚡

**Use for:**
- Simple Q&A questions
- Memory retrieval queries
- Status checks
- Brief confirmations
- Quick calculations

**Budget constraints:**
- Maximum: **100 prompts per 5-hour window**
- Throttle: ~1 prompt per 3 minutes average
- Alert threshold: 70% usage (70 prompts)
- Critical threshold: 90% usage (90 prompts)

**When NOT to use:**
- Complex reasoning tasks
- Multi-step planning
- Code generation (use Cursor)
- Long conversations

---

### Tier 2: Cursor CLI (Development Work) 🔧

**Use for:**
- Code generation
- File operations and edits
- Long-running development tasks
- Project refactoring
- Debugging and problem-solving

**Budget:**
- **Unlimited** development sessions
- Model selection: Auto, Claude, or GPT-5.2 based on task complexity
- No strict prompt limits

**Best practices:**
- Use for anything involving files or code
- Preferred for tasks requiring context across multiple files
- Ideal for sustained work sessions

---

### Tier 3: Claude Code (Complex Reasoning) 🧠

**Use for:**
- Multi-step reasoning
- Strategic planning
- Complex orchestration
- Meta-cognition tasks
- Self-evolution and learning
- Architecture decisions

**Budget:**
- **Use sparingly** (conservative limits)
- Reserve for tasks requiring deep reasoning
- Maximum: ~50 prompts per hour (estimate - verify actual limits)

**When to reserve for:**
- "How should I approach this problem?"
- "What's the best architecture for X?"
- "Analyze and improve my workflow"
- Self-reflection and meta-tasks

---

## Decision Flowchart

```
Is this a simple Q&A or memory check?
├─ YES → Use MiniMax (if within budget)
└─ NO → Is this code/development work?
         ├─ YES → Use Cursor CLI
         └─ NO → Is this complex reasoning/planning?
                  ├─ YES → Use Claude Code (sparingly)
                  └─ NO → Default to MiniMax if simple, Cursor if unsure
```

---

## Budget Tracking

The `budget-tracker.js` script monitors usage:

```bash
# Check current status
node memory/budget-tracker.js status

# Track a call manually
node memory/budget-tracker.js track minimax

# Get provider suggestion for a task
node memory/budget-tracker.js suggest code
node memory/budget-tracker.js suggest reasoning
```

---

## Auto-Rotation Rules

When a provider reaches capacity:

1. **MiniMax exhausted** → Rotate to Cursor CLI for development, or Claude Code for reasoning
2. **Claude Code exhausted** → Fall back to MiniMax (if simple) or Cursor CLI
3. **All exhausted** → Use MiniMax with throttle warnings

The system tracks:
- Current count per provider
- Time remaining in current window
- Automatic alerts at 70% and 90% usage

---

## Session Guidelines

### Quick Session (MiniMax)
- Keep prompts under 50 tokens when possible
- Avoid follow-up chains if possible
- Use for single-turn interactions

### Development Session (Cursor CLI)
- Open extended sessions
- Provide full context
- Use for iterative development
- Model selection: GPT-5.2 for fast prototyping, Claude for complex logic

### Reasoning Session (Claude Code)
- Limit to 5-10 prompts per session
- Be explicit about reasoning requirements
- Use for planning before development

---

## Cost Optimization Tips

1. **Batch MiniMax requests** when possible
2. **Use Cursor for file operations** - it's unlimited
3. **Plan complex reasoning** before switching to Claude Code
4. **Monitor alerts** - don't wait until 90% usage
5. **Reset budgets** at natural boundaries (new day, new project)

---

## Emergency Procedures

**If MiniMax is exhausted:**
```bash
# Check status
node memory/budget-tracker.js status

# Rotate to alternative
node memory/budget-tracker.js rotate development

# Or reset if new window (use judgment)
node memory/budget-tracker.js reset minimax
```

**If Claude Code alerts:**
- Pause meta-tasks
- Switch to Cursor CLI for implementation
- Document reasoning for later Claude Code review

---

## Review Schedule

- **Weekly**: Review budget-tracker.json for patterns
- **Monthly**: Adjust limits based on actual usage
- **Quarterly**: Re-evaluate provider mix and limits

---

*Last updated: 2026-02-05*
*Budget tracker: memory/budget-tracker.js*
