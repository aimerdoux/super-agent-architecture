# Cursor CLI Integration - OpenClaw Configuration

## Current Status: ✅ ALREADY CONFIGURED

The Cursor CLI backend is already fully configured in `openclaw.json`.

## Configuration Summary

### Model Aliases (in `agents.defaults.models`)
```json
{
  "cursor-cli/auto": { "alias": "Cursor (Auto)" },
  "cursor-cli/claude-sonnet-4-20250514": { "alias": "Cursor (Claude)" },
  "cursor-cli/gpt-5.2": { "alias": "Cursor (GPT-5.2)" }
}
```

### CLI Backend Configuration (in `agents.defaults.cliBackends.cursor-cli`)
```json
{
  "command": "cmd",
  "args": ["/c", "C:\\Users\\play4\\.openclaw\\cursor-agent-run.cmd", "-p", "--output-format", "text"],
  "output": "text",
  "input": "arg",
  "modelArg": "--model",
  "modelAliases": {
    "auto": "auto",
    "claude-sonnet-4-20250514": "sonnet-4.5",
    "sonnet-4.5": "sonnet-4.5",
    "opus-4.5": "opus-4.5",
    "gpt-5.2": "gpt-5.2",
    "gpt-5.2-codex": "gpt-5.2-codex"
  },
  "sessionArg": "--resume",
  "sessionMode": "existing"
}
```

## Files Present

| File | Location | Status |
|------|----------|--------|
| `cursor-agent-run.cmd` | `C:\Users\play4\.openclaw\` | ✅ Exists |
| `CURSOR-CLI-SETUP.md` | `C:\Users\play4\.openclaw\` | ✅ Exists |
| Cursor Agent | `C:\Users\play4\AppData\Local\cursor-agent\versions\2026.01.23-916f423\` | ✅ Installed |

## Usage

```bash
# Use Cursor Auto mode
openclaw agent --message "hello" --model cursor-cli/auto

# Use Cursor Claude
openclaw agent --message "hello" --model cursor-cli/claude-sonnet-4-20250514

# Use Cursor GPT-5.2
openclaw agent --message "hello" --model cursor-cli/gpt-5.2
```

## Known Issues & Workarounds

| Issue | Workaround |
|-------|------------|
| PowerShell parsing issues with `--` in exec | Use `cmd /c` wrapper (already configured via `cursor-agent-run.cmd`) |
| Cursor Agent version folder changes on update | Update paths in `openclaw.json` and `cursor-agent-run.cmd` when Cursor updates |
| Non-interactive mode may hang | Use short prompts for testing |

## Budget Context

- **MiniMax**: 100 prompts/5 hours (use sparingly)
- **Cursor CLI**: Unlimited for development
- **Claude Code**: Limited but powerful

Cursor CLI is the preferred choice for unlimited development work.
