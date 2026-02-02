# Self-Upgrading Agent Architecture

**Vision: An agent that can upgrade itself, deploy to the cloud, and maintain persistent operation**

---

## 🎯 Problem Statement

| Issue | Current State | Desired State |
|-------|---------------|---------------|
| Terminal Shutdown | Agent dies | Agent persists |
| Manual Deployments | Human pushes code | Agent deploys itself |
| Cron Management | External scheduler | Agent manages triggers |
| State Persistence | Local files | Cloud-native |
| Self-Modification | Manual edits | Autonomous updates |

---

## 🏗️ Proposed Architecture

```
SELF-UPGRADING AGENT ECOSYSTEM
│
├─ CLOUD CONTROL PLANE
│  ├─ Supabase Database (state/memory)
│  ├─ Edge Functions (self-upgrade engine)
│  ├─ pg_cron (scheduler)
│  └─ GitHub Actions (deployments)
│
├─ PRIMARY AGENT (Cloud - Always On)
│  └─ Persistent, self-upgrading, cloud-native
│
├─ BACKUP AGENT (Failover)
│  └─ Hot standby
│
└─ LOCAL TERMINAL AGENT (Development)
   └─ Debug/testing, connects to cloud state
```

---

## ☁️ Cloud Components

### 1. Supabase (Primary Backend)

**Core tables for agent state:**

```sql
-- Agent state tracking
CREATE TABLE agent_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version TEXT NOT NULL,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    config JSONB DEFAULT '{}',
    status TEXT DEFAULT 'running',
    health_check TIMESTAMPTZ DEFAULT NOW()
);

-- Memory storage (replaces local files)
CREATE TABLE memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    tier TEXT CHECK (tier IN ('short-term', 'working', 'long-term')),
    embedding VECTOR(768),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '30 days'
);

-- Scheduled tasks
CREATE TABLE scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    cron_expression TEXT NOT NULL,
    task_type TEXT NOT NULL,
    payload JSONB NOT NULL,
    enabled BOOLEAN DEFAULT true,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- System logs
CREATE TABLE agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT CHECK (level IN ('info', 'warn', 'error', 'debug')),
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable pg_cron for scheduling
CREATE EXTENSION IF NOT EXISTS pg_cron;
```

### 2. Edge Functions (Self-Upgrade Engine)

```typescript
// supabase/functions/self-upgrade/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

serve(async (req) => {
  const { action, code, commit_message } = await req.json()
  const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  switch (action) {
    case 'pull':
      // Pull latest from GitHub
      const latest = await fetch('https://api.github.com/repos/user/super-agent/contents', {
        headers: { Authorization: `Bearer ${Deno.env.get('GITHUB_TOKEN')}` }
      }).then(r => r.json())
      
      // Update database with new version
      await supabase.from('agent_state').update({
        version: latest.sha,
        last_updated: new Date().toISOString()
      }).eq('id', 'primary')
      
      return new Response(JSON.stringify({ status: 'upgraded', version: latest.sha }))

    case 'deploy':
      // Trigger deployment via GitHub Actions
      await fetch('https://api.github.com/repos/user/super-agent/actions/workflows/deploy.yml/dispatches', {
        method: 'POST',
        headers: { 
          Authorization: `Bearer ${Deno.env.get('GITHUB_TOKEN')}`,
          Accept: 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({ ref: 'main' })
      })
      
      return new Response(JSON.stringify({ status: 'deploying' }))

    case 'upgrade_and_deploy':
      // Pull + deploy in one transaction
      await supabase.rpc('atomic_upgrade_and_deploy', { 
        commit_message: commit_message || 'Auto-upgrade',
        new_code: code 
      })
      
      return new Response(JSON.stringify({ status: 'complete' }))
  }
})
```

### 3. Cron Management (pg_cron)

```sql
-- Self-health check every 5 minutes
SELECT cron.schedule('agent-health-check', '*/5 * * * *', $$
  UPDATE agent_state SET health_check = NOW() WHERE id = 'primary'
$$);

-- Auto-upgrade check every 6 hours
SELECT cron.schedule('auto-upgrade-check', '0 */6 * * *', $$
  SELECT net.http_post(
    url:='https://project.functions.supabase.co/self-upgrade',
    body:=json_build_object('action', 'pull')
  )
$$);

-- Cleanup old logs daily
SELECT cron.schedule('log-cleanup', '0 3 * * *', $$
  DELETE FROM agent_logs WHERE created_at < NOW() - INTERVAL '7 days'
$$);
```

---

## 🔄 Self-Upgrade Workflow

```
1. TRIGGER
   ├── Scheduled (every 6 hours)
   ├── Manual (API call)
   └── Event-based (webhook from GitHub)
           │
           ▼
2. CHECK
   ├── Fetch latest commit from GitHub
   ├── Compare with current version
   └── If newer → proceed, else → wait
           │
           ▼
3. VALIDATE
   ├── Run smoke tests
   ├── Check syntax/typos
   └── Verify critical functions work
           │
           ▼
4. BACKUP
   ├── Snapshot current state to Supabase
   ├── Save memory to database
   └── Store config version
           │
           ▼
5. APPLY
   ├── Pull new code
   ├── Update database version
   ├── Trigger Edge Function deployment
   └── Notify (Slack/WhatsApp)
           │
           ▼
6. VERIFY
   ├── Health check endpoint
   ├── Test critical paths
   └── Rollback if failed
           │
           ▼
7. REPORT
   ├── Log to Supabase
   ├── Send notification
   └── Update metrics
```

---

## 🏃 Persistent Operation Design

### Primary: Cloud Agent (Always-On)

```yaml
# deploy.yml (GitHub Actions)
name: Self-Deploy Agent

on:
  push:
    branches: [main]
  workflow_dispatch:
    inputs:
      action:
        description: 'Action to perform'
        required: true
        default: 'deploy'
        options: [deploy, restart, status, upgrade]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Supabase
        uses: supabase/setup-cli@v1
        with:
          version: latest
      
      - name: Deploy to Edge Functions
        run: |
          supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }}
          supabase functions deploy self-upgrade --no-verify-jwt
          supabase functions deploy agent-core --no-verify-jwt
      
      - name: Restart Agent
        run: |
          curl -X POST "https://project.functions.supabase.co/agent-core" \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_SERVICE_KEY }}" \
            -d '{"action": "restart"}'
      
      - name: Verify Health
        run: |
          sleep 10
          curl -f "https://project.functions.supabase.co/health"
```

### Secondary: Local Terminal Agent (Development)

```bash
#!/bin/bash
# persistent-agent.sh - Run agent that survives terminal close

# Use nohup to detach from terminal
nohup openclaw gateway start --port 18789 \
  --health-check "https://project.functions.supabase.co/health" \
  > /var/log/openclaw.log 2>&1 &

# Save PID for management
echo $! > /var/run/openclaw.pid

# Setup system service for auto-restart
sudo cp openclaw.service /etc/systemd/system/
sudo systemctl enable openclaw
sudo systemctl start openclaw
```

### System Service (Auto-restart on crash)

```ini
# /etc/systemd/system/openclaw.service
[Unit]
Description=OpenClaw Super Agent
After=network.target

[Service]
Type=simple
User=play4
WorkingDirectory=/home/play4/.openclaw/workspace
ExecStart=/usr/bin/openclaw gateway start --port 18789
Restart=always
RestartSec=10
Environment=OPENCLAW_Workspace=/home/play4/.openclaw/workspace
Environment=SUPABASE_URL=https://xxx.supabase.co
Environment=SUPABASE_SERVICE_KEY=xxx

# Health check
ExecStartPost=curl -X POST "https://project.functions.supabase.co/register" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_KEY" \
  -d "{\"host\": \"$(hostname)\", \"port\": 18789}"

[Install]
WantedBy=multi-user.target
```

---

## 🛠️ Self-Deployment Capabilities

### Agent Actions for Self-Management

```typescript
interface SelfUpgrade {
  // Check for updates
  async checkForUpdates(): Promise<UpdateAvailable | null>
  
  // Pull and apply updates
  async upgrade(): Promise<UpgradeResult>
  
  // Deploy to cloud
  async deployToCloud(): Promise<DeployResult>
  
  // Manage cronjobs
  async scheduleTask(config: TaskConfig): Promise<TaskId>
  async removeTask(taskId: string): Promise<void>
  
  // Health & recovery
  async healthCheck(): Promise<HealthStatus>
  async recoverFromBackup(): Promise<void>
  
  // Log & monitor
  async logEvent(event: LogEvent): Promise<void>
  async getMetrics(): Promise<Metrics>
}
```

### Example: Agent Upgrading Itself

```javascript
// Agent can say:
await meta_skill_acquire({
  skillName: "self-upgrade",
  proficiency: "expert"
});

// Later, when triggered:
if (await shouldUpgrade()) {
  await selfUpgrade.pullLatest();
  await selfUpgrade.validate();
  await selfUpgrade.backupState();
  await selfUpgrade.deploy();
  await selfUpgrade.notify("Self-upgrade complete!");
}
```

---

## 📊 Deployment Options Comparison

| Feature | Supabase | Railway | Fly.io | Docker/Cloud Run |
|---------|----------|---------|--------|------------------|
| **Persistence** | DB: ✅ Paid | ✅ Paid | ✅ | ✅ |
| **Edge Functions** | ✅ Built-in | ❌ | ✅ | ❌ |
| **Cron Jobs** | ✅ pg_cron | ✅ | ❌ | ⚠️ External |
| **Self-Deploy** | ✅ Git-trigger | ✅ Auto-deploy | ✅ | ✅ |
| **Cost** | Free tier good | $5+/mo | $5+/mo | Pay-per-use |
| **Difficulty** | Easy | Easy | Medium | Hard |
| **Self-Upgrade** | ✅ Possible | ✅ Possible | ✅ Possible | ✅ Possible |

### 🏆 Recommendation: **Supabase + GitHub Actions**

1. **Supabase** for database, Edge Functions, and cron
2. **GitHub Actions** for deployments
3. **GitHub** for code versioning and self-upgrades
4. **pg_cron** for scheduling

---

## 🎯 Implementation Roadmap

### Phase 1: Cloud Foundation (This Week)
- [ ] Set up Supabase project
- [ ] Create database schema
- [ ] Deploy Edge Functions
- [ ] Set up GitHub Actions workflow

### Phase 2: Self-Upgrade Engine (Next Week)
- [ ] Implement self-upgrade function
- [ ] Create health check system
- [ ] Add rollback capability
- [ ] Test upgrade workflow

### Phase 3: Persistence (Week 3)
- [ ] Move memory to Supabase
- [ ] Implement state snapshots
- [ ] Add crash recovery
- [ ] Setup system service

### Phase 4: Full Autonomy (Week 4)
- [ ] Agent manages its own cronjobs
- [ ] Self-diagnosis and repair
- [ ] Performance optimization
- [ ] Complete documentation

---

## 💰 Estimated Costs

| Component | Free Tier | Paid (if needed) |
|-----------|-----------|------------------|
| Supabase | 500MB DB, 2GB bandwidth | $25/mo for more |
| GitHub Actions | 2,000 min/month | $0.01/min |
| GitHub Packages | Limited | $0.005/GB |
| **Total** | **Mostly Free** | **~$5-10/mo** |

---

## 🚀 Next Steps

1. **Create Supabase project** (takes 2 minutes)
2. **Run setup script** to create tables/functions
3. **Configure GitHub Actions** for auto-deploy
4. **Test self-upgrade** with a minor change

**Want me to proceed with creating the Supabase setup and GitHub Actions workflow?**

Your agent could then literally say:
> *"I'm upgrading myself to the latest version..."* 🤖✨
