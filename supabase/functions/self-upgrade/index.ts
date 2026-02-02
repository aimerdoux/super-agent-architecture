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

serve(async (req: Request): Promise<Response> => {
  // CORS headers
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
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const githubToken = Deno.env.get('GITHUB_TOKEN')!
    const repoOwner = Deno.env.get('REPO_OWNER') || 'aimerdoux'
    const repoName = Deno.env.get('REPO_NAME') || 'super-agent-architecture'

    const supabase = createClient(supabaseUrl, serviceKey)

    // Log the action
    await supabase.from('agent_logs').insert({
      level: 'info',
      source: 'self-upgrade',
      message: `Self-upgrade action triggered: ${action}`,
      context: { action, commit_sha }
    })

    switch (action) {
      case 'health':
        // Health check endpoint
        const { data: state } = await supabase
          .from('agent_state')
          .select('*')
          .eq('agent_name', 'super-agent')
          .single()
        
        if (!state) {
          return new Response(JSON.stringify({ status: 'error', message: 'No agent state' }), { headers })
        }

        const healthOk = new Date(state.health_check).getTime() > Date.now() - 5 * 60 * 1000
        
        return new Response(JSON.stringify({
          status: healthOk ? 'healthy' : 'unhealthy',
          version: state.version,
          last_heartbeat: state.last_heartbeat,
          uptime: state.status === 'running'
        }), { headers })

      case 'check':
        // Check for updates on GitHub
        const latestCommit = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/commits/main`,
          { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' } }
        ).then(r => r.json())

        const currentVersion = (await supabase
          .from('agent_state')
          .select('version')
          .eq('agent_name', 'super-agent')
          .single()).data?.version || 'unknown'

        const hasUpdate = latestCommit.sha !== currentVersion

        return new Response(JSON.stringify({
          status: 'success',
          current_version: currentVersion,
          latest_version: latestCommit.sha,
          has_update: hasUpdate,
          commit: {
            sha: latestCommit.sha,
            message: latestCommit.commit?.message,
            author: latestCommit.commit?.author?.name,
            date: latestCommit.commit?.author?.date
          }
        }), { headers })

      case 'pull':
        // Pull latest changes locally
        const pullResult = await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/commits/main`,
          { headers: { Authorization: `Bearer ${githubToken}`, Accept: 'application/vnd.github.v3+json' } }
        ).then(r => r.json())

        // Update agent state
        await supabase
          .from('agent_state')
          .update({
            version: pullResult.sha,
            commit_sha: pullResult.sha,
            last_updated: new Date().toISOString(),
            status: 'updating'
          })
          .eq('agent_name', 'super-agent')

        // Record upgrade history
        await supabase.from('upgrade_history').insert({
          from_version: currentVersion,
          to_version: pullResult.sha,
          commit_sha: pullResult.sha,
          changelog: pullResult.commit?.message,
          status: 'success',
          completed_at: new Date().toISOString()
        })

        return new Response(JSON.stringify({
          status: 'success',
          pulled: true,
          new_version: pullResult.sha,
          message: 'Agent upgraded successfully'
        }), { headers })

      case 'deploy':
        // Trigger GitHub Actions deployment
        await fetch(
          `https://api.github.com/repos/${repoOwner}/${repoName}/actions/workflows/deploy.yml/dispatches`,
          {
            method: 'POST',
            headers: { 
              Authorization: `Bearer ${githubToken}`,
              Accept: 'application/vnd.github.v3+json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ 
              ref: 'main',
              inputs: payload || {}
            })
          }
        )

        return new Response(JSON.stringify({
          status: 'success',
          deploying: true,
          message: 'Deployment triggered via GitHub Actions'
        }), { headers })

      case 'rollback':
        // Rollback to previous version
        if (!commit_sha) {
          return new Response(JSON.stringify({ status: 'error', message: 'commit_sha required' }), { headers })
        }

        const rollbackState = await supabase
          .from('upgrade_history')
          .select('*')
          .eq('commit_sha', commit_sha)
          .single()

        if (!rollbackState.data) {
          return new Response(JSON.stringify({ status: 'error', message: 'Commit not found' }), { headers })
        }

        await supabase
          .from('agent_state')
          .update({
            version: commit_sha,
            commit_sha: commit_sha,
            status: 'running'
          })
          .eq('agent_name', 'super-agent')

        await supabase
          .from('upgrade_history')
          .update({
            status: 'rolled_back',
            rollback_commit_sha: commit_sha
          })
          .eq('id', rollbackState.data.id)

        return new Response(JSON.stringify({
          status: 'success',
          rolled_back: true,
          version: commit_sha
        }), { headers })

      case 'status':
        // Get full agent status
        const { data: agentState } = await supabase
          .from('agent_state')
          .select('*')
          .eq('agent_name', 'super-agent')
          .single()

        const { data: recentUpgrades } = await supabase
          .from('upgrade_history')
          .select('*')
          .order('started_at', { ascending: false })
          .limit(5)

        const { data: nextTasks } = await supabase
          .from('scheduled_tasks')
          .select('*')
          .eq('enabled', true)
          .lte('next_run', new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString())
          .order('next_run', { ascending: true })
          .limit(5)

        return new Response(JSON.stringify({
          agent: agentState,
          recent_upgrades: recentUpgrades,
          scheduled_tasks: nextTasks
        }), { headers })

      default:
        return new Response(JSON.stringify({ status: 'error', message: 'Unknown action' }), { headers })
    }
  } catch (error) {
    return new Response(JSON.stringify({ 
      status: 'error', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    }), { status: 500, headers })
  }
})
