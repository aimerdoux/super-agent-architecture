@echo off
REM Push to GitHub using gh CLI (uses stored auth from `gh auth login`)
cd /d "C:\Users\play4\.openclaw\workspace\super-agent-architecture"
"C:\Program Files\GitHub CLI\gh.exe" repo create super-agent-architecture --public --description "Advanced, self-evolving AI assistant built with OpenClaw" --source=. --push
