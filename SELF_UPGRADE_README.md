# Super Agent Self-Upgrading Infrastructure

Complete system for a truly autonomous, self-upgrading agent that survives terminal shutdowns and manages its own lifecycle.

## 📁 Files

| File | Purpose |
|------|---------|
| `supabase/schema.sql` | Complete database schema with tables, functions, and initial data |
| `supabase/functions/self-upgrade/index.ts` | Self-upgrade Edge Function |
| `supabase/functions/agent-core/index.ts` | Agent core management function |
| `.github/workflows/deploy.yml` | GitHub Actions workflow for auto-deployment |
| `systemd/openclaw-agent.service` | Systemd service for auto-restart |
| `setup.bat` | Quick setup script |
| `self-upgrading-agent.md` | Full architecture documentation |

## 🚀 Quick Start

### 1. Create Supabase Project

1. Go to https://supabase.com and create a new project
2. Note your Project URL and Project ID
3. Go to SQL Editor and run `supabase/schema.sql`

### 2. Configure GitHub Secrets

Add to your repository Settings → Secrets and variables → Actions:

| Secret Name | Value |
|------------|-------|
| `SUPABASE_PROJECT_REF` | Your Supabase project ID |
| `SUPABASE_ACCESS_TOKEN` | Supabase CLI token (`supabase auth token`) |
| `SUPABASE_SERVICE_KEY` | Supabase service_role key |
| `GITHUB_TOKEN` | GitHub PAT with `repo` scope |

### 3. Deploy Edge Functions

```bash
npx supabase functions deploy self-upgrade --project-ref YOUR_PROJECT_REF
npx supabase functions deploy agent-core --project-ref YOUR_PROJECT_REF
```

### 4. Push to Trigger Deployment

```bash
git add .
git commit -m "Add self-upgrading infrastructure"
git push origin main
```

## 🔄 How Self-Upgrade Works

```
Git Push → GitHub Actions → Deploy Functions → Update Database → Agent Notified
```

### Health Check Endpoints

```bash
# Agent status
curl https://YOUR_PROJECT.functions.supabase.co/agent-core \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'

# Self-upgrade health
curl https://YOUR_PROJECT.functions.supabase.co/self-upgrade \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "health"}'
```

## 📊 Scheduled Tasks

The system automatically manages these tasks:

| Task | Schedule | Purpose |
|------|----------|---------|
| Health Check | Every 5 min | Verify agent is running |
| Upgrade Check | Every 6 hrs | Check for new versions |
| Memory Cleanup | Daily 3 AM | Remove expired memories |
| Memory Consolidation | Hourly | Move important memories to long-term |

## 🛠️ API Actions

### agent-core

- `status` - Get agent status
- `restart` - Restart the agent
- `configure` - Update configuration
- `memory` - Store/recall memories
- `execute` - Execute a task

### self-upgrade

- `health` - Check upgrade system health
- `check` - Check for new versions
- `pull` - Pull latest code
- `deploy` - Trigger deployment
- `rollback` - Rollback to previous version
- `status` - Get full upgrade status

## 🔒 Security

- All Edge Functions require authentication
- RLS policies protect sensitive data
- Service role key required for admin operations
- GitHub Actions uses encrypted secrets

## 💰 Costs

- **Supabase**: Free tier (500MB DB, 2GB bandwidth)
- **GitHub Actions**: 2,000 min/month free
- **Total**: ~$0-10/month depending on usage

## 📚 Documentation

- See `self-upgrading-agent.md` for full architecture
- See `supabase/schema.sql` for database details
- See `.github/workflows/deploy.yml` for CI/CD pipeline

---

**Status: Ready for Deployment** ✅

The agent can now:
- Upgrade itself automatically
- Deploy to the cloud
- Survive terminal shutdowns
- Manage its own cronjobs
- Recover from crashes
