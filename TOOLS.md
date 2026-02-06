# TOOLS.md - Local Notes

Skills define *how* tools work. This file is for *your* specifics — the stuff that's unique to your setup.

## exec on Windows

On this machine the default shell is **PowerShell**. The `exec` tool runs commands in that shell.

- **JavaScript / Node code:** Do **not** pass raw JS to `exec` (PowerShell will try to parse it and fail). Instead:
  - Use `node -e "your code here"` for one-liners, or
  - Write a `.js` file with the `write` tool, then `exec` with `node path/to/script.js`
- **PowerShell redirects:** Never use `2> |` (missing file after redirect). Use:
  - `2>$null` to discard stderr, or
  - `2>&1` to merge stderr into stdout, then pipe: `... 2>&1 | Select-Object ...`
  - Example (find files): `Get-ChildItem -Path 'C:\...\skills' -Filter '*whisper*' -Recurse 2>$null | Select-Object FullName`
- **When exec fails:** Fix common issues (wrong redirect, raw JS, bad quoting) and **retry once** before reporting failure. Keeps the platform self-sustaining.
- **Long-running or agentic flows:** Runs can time out (default 5 minutes). Prefer shorter steps; break big tasks into smaller exec calls and report progress.

## What Goes Here

Things like:
- Camera names and locations
- SSH hosts and aliases  
- Preferred voices for TTS
- Speaker/room names
- Device nicknames
- Anything environment-specific

## Examples

```markdown
### Cameras
- living-room → Main area, 180° wide angle
- front-door → Entrance, motion-triggered

### SSH
- home-server → 192.168.1.100, user: admin

### TTS
- Preferred voice: "Nova" (warm, slightly British)
- Default speaker: Kitchen HomePod
```

## Why Separate?

Skills are shared. Your setup is yours. Keeping them apart means you can update skills without losing your notes, and share skills without leaking your infrastructure.

---

## Wrapper / error handler (Cursor CLI on failure)

**Goal:** When `exec` (or a tool) fails, catch the error and call Cursor CLI to fix it instead of stopping—so the platform is self-sustaining and redundant.

**Current limitation:** OpenClaw does **not** expose a hook for "tool failure" or "exec failure". The internal hooks are: `command`, `gateway`, `agent` (e.g. `command:new`, `gateway:startup`, `agent:bootstrap`). There is no `tool:fail` or `exec:fail` event to register a handler that would invoke Cursor CLI.

**What we do instead:**
- **Agent instructions** (AGENTS.md): On exec failure, the agent must fix the command (redirects, Node for JS) and **retry once** before reporting failure. That gives one automatic self-correction per exec.
- **TOOLS.md rules:** Correct PowerShell and Node usage so the agent generates valid commands and avoids common failures.

**If you want a true wrapper later:**
1. **Ask OpenClaw** for a `tool:fail` or `exec:fail` hook so a custom handler can run (e.g. call Cursor CLI with the failed command and error).
2. **Or** implement a workspace script the agent is instructed to use for risky exec: e.g. `run-safe.ps1 "command"` that runs the command and on non-zero exit writes context to a file and optionally spawns `cursor-cli` with a prompt to fix the command. The agent would need to always use this script instead of raw exec for certain operations.

---

Add whatever helps you do your job. This is your cheat sheet.

---

## Sandbox Testing Framework

The workspace includes a **Sandbox Testing Framework** (`sandbox-tester.js`) for safe experimentation without risking production state or killing PIDs.

### Quick Start

```javascript
const { createSandbox } = require('./sandbox-tester');

async function testSomething() {
  const sandbox = createSandbox({ mode: 'dry-run' });
  
  // Execute commands safely
  const result = await sandbox.execute('echo', ['Hello Sandbox']);
  
  // Generate test report
  const report = sandbox.generateReport('my-test');
  
  // Cleanup tracked processes
  sandbox.cleanup();
}
```

### Sandbox Modes

| Mode | Description | Use Case |
|------|-------------|----------|
| `dry-run` | Simulate everything, log actions | Preview what would happen |
| `mock` | Use mocked responses | Fast unit testing |
| `limited` | Execute with resource caps | Resource-constrained testing |
| `production` | Real execution (opt-in) | Actual production runs |

### Key Features

**Isolation Layer:**
- `execute(command, args, options)` - Execute commands safely
- `testAgent(agentScript, testInputs)` - Test agents in isolation
- File snapshots before/after operations

**PID-Safe Execution:**
- Process registry tracks all spawned processes
- `healthCheck()` - Monitor process status
- `cleanup()` - Gracefully terminate all tracked processes
- Automatic timeout handling (default 30s)

**Test Reporting:**
- `generateReport(testName)` - Generate JSON reports
- Reports saved to `memory/sandbox-results/`
- Includes execution logs, process info, and summaries

**File Operations:**
- `snapshotFile(path, label)` - Capture file state
- `compareSnapshots(path)` - Detect changes
- `rollbackFile(path)` - Restore previous state

### CLI Usage

```bash
# Run in dry-run mode
node sandbox-tester.js dry-run

# Run in mock mode
node sandbox-tester.js mock

# Quick test function
const { runQuickTest } = require('./sandbox-tester');
await runQuickTest('mock');
```

### Integration Test

Run the full integration test:

```bash
node sandbox-integration-test.js
```

This tests all modes, agent spawning, health checks, and file rollback functionality.

### Example: Testing a New Agent

```javascript
const sandbox = createSandbox({ mode: 'mock' });

// Test agent with multiple inputs
const results = await sandbox.testAgent('./my-new-agent.js', [
  'test-input-1',
  'test-input-2',
  'test-input-3',
]);

// Check file changes
if (results.fileChanges.changed) {
  console.log('Agent modified files');
  sandbox.rollbackFile('./my-new-agent.js');
}

// Generate report
sandbox.generateReport('agent-validation');
```
