---
name: git-sync
version: 1.0.0
description: Automatically syncs local workspace changes to the remote GitHub repository
author: OpenClaw Self-Evolution System
homepage: https://github.com/openclaw
permissions: {}
metadata: {}
---

# git-sync

Automatically syncs local workspace changes to the remote GitHub repository.

## Features

- Automatic git add, commit, and push
- Configurable commit messages
- Sync on interval or manual trigger
- Conflict detection and reporting
- Backup before sync

## Usage

```bash
# Sync workspace to GitHub
git-sync sync "Your commit message"

# Check sync status
git-sync status

# Configure remote repo
git-sync configure <repo-url>
```

## Installation

This skill is installed via the OpenClaw skills system.
