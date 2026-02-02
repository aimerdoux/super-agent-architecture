// Self-Upgrade Edge Function
// supabase/functions/self-upgrade/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface UpgradeRequest {
  action: 'check' | 'pull' | 'deploy' | 'rollback' | 'status' | 'health';
  commit_sha?: string;
  commit_message?: string;
  payload?: Record<string, unknown>;
}

const GITHUB_API = 'https://api.github.com';
const REPO_OWNER = 'aimerdoux';
const REPO_NAME = 'super-agent-architecture';

serve(async (req: Request): Promise<Response> => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Content-Type': 'application/json',
  }

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers })
  }

  try {
    const { action, commit_sha, commit_message, payload } = await req.json() as UpgradeRequest

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    const githubToken = Deno.env.get('GITHUB_TOKEN') || ''

    if (!supabaseUrl || !serviceKey) {
      return new Response(JSON.stringify({
        status: 'error',
        message: 'Missing environment variables',
        env_check: { hasUrl: !!supabaseUrl, hasKey: !!serviceKey }
      }), { status: 500, headers })
    }

    const supabase = createClient(supabaseUrl, serviceKey)

    // Helper: get agent state
    const getAgentState = async () => {
      const { data, error } = await supabase
        .from('agent_state')
        .select('*')
        .eq('agent_name', 'super-agent')
        .single()
      if (error || !data) throw new Error('Agent state not found. Run schema.sql first.')
      return data
    }

    // Helper: log event
    const logEvent = async (level: string, message: string, context: Record<string, unknown> = {}) => {
      await supabase.from('agent_logs').insert({
        level,
        source: 'self-upgrade',
        message,
        context
      }).catch(() => {})
    }

    await logEvent('info', `Self-upgrade action: ${action}`, { action, commit_sha })

    switch (action) {
      case 'health': {
        const state = await getAgentState()
        const healthOk = new Date(state.health_check).getTime() > Date.now() - 5 * 60 * 1000

        return new Response(JSON.stringify({
          status: healthOk ? 'healthy' : 'unhealthy',
          version: state.version,
          last_heartbeat: state.last_heartbeat,
          uptime: state.status === 'running'
        }), { headers })
      }

      case 'check': {
        const state = await getAgentState()

        let latestSha = null
        if (githubToken) {
          try {
            const res = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/commits/main`, {
              headers: {
                'Authorization': `Bearer ${githubToken}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Super-Agent/1.0'
              }
            })
            if (res.ok) {
              const commit = await res.json()
              latestSha = commit.sha
            }
          } catch {}
        }

        const hasUpdate = latestSha && state.commit_sha ? latestSha !== state.commit_sha : false

        return new Response(JSON.stringify({
          status: 'success',
          current_version: state.version,
          current_sha: state.commit_sha || 'unknown',
          latest_sha: latestSha || 'unknown',
          has_update: hasUpdate,
          message: hasUpdate ? 'Update available' : 'Up to date'
        }), { headers })
      }

      case 'pull': {
        const state = await getAgentState()

        if (!githubToken) {
          return new Response(JSON.stringify({
            status: 'error',
            message: 'GITHUB_TOKEN not configured'
          }), { status: 400, headers })
        }

        // Fetch latest commit
        const commitRes = await fetch(`${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/commits/main`, {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'Super-Agent/1.0'
          }
        })

        if (!commitRes.ok) {
          return new Response(JSON.stringify({
            status: 'error',
            message: `GitHub API error: ${commitRes.status}`
          }), { status: 502, headers })
        }

        const commit = await commitRes.json()

        // Record upgrade
        const { data: upgrade } = await supabase
          .from('upgrade_history')
          .insert({
            from_version: state.version,
            to_version: state.version, // same version, new commit
            commit_sha: commit.sha,
            changelog: commit.commit?.message || commit_message || 'Pull update',
            status: 'in_progress'
          })
          .select()
          .single()

        // Update agent state with new commit
        await supabase
          .from('agent_state')
          .update({
            commit_sha: commit.sha,
            last_updated: new Date().toISOString(),
            status: 'running'
          })
          .eq('id', state.id)

        // Mark upgrade complete
        if (upgrade) {
          await supabase
            .from('upgrade_history')
            .update({ status: 'success', completed_at: new Date().toISOString() })
            .eq('id', upgrade.id)
        }

        await logEvent('info', `Pulled update: ${commit.sha.substring(0, 7)}`, {
          from_sha: state.commit_sha,
          to_sha: commit.sha
        })

        return new Response(JSON.stringify({
          status: 'success',
          message: 'Update pulled',
          commit_sha: commit.sha,
          commit_message: commit.commit?.message
        }), { headers })
      }

      case 'deploy': {
        if (!githubToken) {
          return new Response(JSON.stringify({
            status: 'error',
            message: 'GITHUB_TOKEN not configured'
          }), { status: 400, headers })
        }

        // Trigger GitHub Actions deployment
        const dispatchRes = await fetch(
          `${GITHUB_API}/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/deploy.yml/dispatches`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Accept': 'application/vnd.github.v3+json',
              'User-Agent': 'Super-Agent/1.0',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ ref: 'main' })
          }
        )

        await logEvent('info', 'Deployment triggered via GitHub Actions')

        return new Response(JSON.stringify({
          status: dispatchRes.ok ? 'success' : 'error',
          message: dispatchRes.ok ? 'Deployment triggered' : `Failed: ${dispatchRes.status}`
        }), { headers })
      }

      case 'rollback': {
        const state = await getAgentState()

        // Get last successful upgrade
        const { data: lastUpgrade } = await supabase
          .from('upgrade_history')
          .select('*')
          .eq('status', 'success')
          .order('completed_at', { ascending: false })
          .limit(2)

        if (!lastUpgrade || lastUpgrade.length < 2) {
          return new Response(JSON.stringify({
            status: 'error',
            message: 'No previous version to rollback to'
          }), { headers })
        }

        const rollbackTarget = lastUpgrade[1] // second most recent success

        await supabase
          .from('agent_state')
          .update({
            commit_sha: rollbackTarget.commit_sha,
            last_updated: new Date().toISOString()
          })
          .eq('id', state.id)

        await supabase
          .from('upgrade_history')
          .insert({
            from_version: state.version,
            to_version: rollbackTarget.to_version,
            commit_sha: rollbackTarget.commit_sha,
            changelog: `Rollback to ${rollbackTarget.commit_sha?.substring(0, 7)}`,
            status: 'success',
            completed_at: new Date().toISOString()
          })

        await logEvent('warn', 'Rollback performed', {
          from_sha: state.commit_sha,
          to_sha: rollbackTarget.commit_sha
        })

        return new Response(JSON.stringify({
          status: 'success',
          message: 'Rolled back',
          rolled_back_to: rollbackTarget.commit_sha
        }), { headers })
      }

      case 'status': {
        const state = await getAgentState()

        const { data: recentUpgrades } = await supabase
          .from('upgrade_history')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(5)

        const { data: recentLogs } = await supabase
          .from('agent_logs')
          .select('*')
          .eq('source', 'self-upgrade')
          .order('created_at', { ascending: false })
          .limit(10)

        return new Response(JSON.stringify({
          status: 'success',
          agent: state,
          recent_upgrades: recentUpgrades || [],
          recent_logs: recentLogs || [],
          message: 'Self-upgrade system operational'
        }), { headers })
      }

      default:
        return new Response(JSON.stringify({
          status: 'error',
          message: `Unknown action: ${action}`
        }), { status: 400, headers })
    }
  } catch (error) {
    return new Response(JSON.stringify({
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error'
    }), { status: 500, headers })
  }
})
