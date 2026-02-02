@echo off
cd /d "C:\Users\play4\.openclaw\workspace\super-agent-architecture"
set GH_TOKEN=ghp_4vVNEpF31B84XnBE7CgVYIHY6HYG7cAiLBvCBTqjYx68DKSgrdtoumpiPKIJNYVS3SYfYuyq
"C:\Program Files\GitHub CLI\gh.exe" repo create super-agent-architecture --public --description "Advanced, self-evolving AI assistant built with OpenClaw" --source=. --push
