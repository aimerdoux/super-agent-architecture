// Agent Core Edge Function - Main agent logic
// supabase/functions/agent-core/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AgentRequest {
  action: 'execute' | 'status' | 'restart' | 'configure' | 'memory';
  task?: string;
  payload?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

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
    const { action, task, payload, context } = await req.json() as AgentRequest
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, serviceKey)

    // Get agent state
    const { data: agentState } = await supabase
      .from('agent_state')
      .select('*')
      .eq('agent_name', 'super-agent')
      .single()

    if (!agentState) {
      return new Response(JSON.stringify({ 
        status: 'error', 
        message: 'Agent not initialized. Run schema.sql first.' 
      }), { headers })
    }

    switch (action) {
      case 'status':
        // Return current status
        await supabase
          .from('agent_state')
          .update({ 
            health_check: new Date().toISOString(),
            last_heartbeat: new Date().toISOString()
          })
          .eq('id', agentState.id)

        return new Response(JSON.stringify({
          status: 'success',
          agent: {
            version: agentState.version,
            status: agentState.status,
            last_heartbeat: agentState.last_heartbeat,
            uptime: agentState.status === 'running'
          }
        }), { headers })

      case 'restart':
        // Mark agent as restarting, then set back to running
        await supabase
          .from('agent_state')
          .update({
            status: 'running',
            last_heartbeat: new Date().toISOString(),
            health_check: new Date().toISOString(),
            metadata: { ...agentState.metadata, last_restart: new Date().toISOString() }
          })
          .eq('id', agentState.id)

        await supabase.from('agent_logs').insert({
          level: 'info',
          source: 'agent-core',
          message: 'Agent restart completed',
          context: { previous_status: agentState.status }
        })

        return new Response(JSON.stringify({
          status: 'success',
          message: 'Agent restarted'
        }), { headers })

      case 'configure':
        // Update agent configuration
        if (!payload) {
          return new Response(JSON.stringify({ status: 'error', message: 'Payload required' }), { headers })
        }

        await supabase
          .from('agent_state')
          .update({ config: payload })
          .eq('id', agentState.id)

        return new Response(JSON.stringify({
          status: 'success',
          message: 'Configuration updated'
        }), { headers })

      case 'memory':
        // Memory operations
        const memoryAction = payload?.action as string
        
        switch (memoryAction) {
          case 'store':
            const { data: stored } = await supabase
              .from('agent_memories')
              .insert({
                content: payload.content,
                tier: payload.tier || 'working',
                category: payload.category,
                metadata: payload.metadata || {}
              })
              .select()
              .single()
            
            return new Response(JSON.stringify({
              status: 'success',
              memory: stored
            }), { headers })

          case 'recall':
            const { data: memories } = await supabase
              .from('agent_memories')
              .select('*')
              .eq('tier', payload.tier || 'working')
              .order('created_at', { ascending: false })
              .limit((payload.limit as number) || 10)
            
            return new Response(JSON.stringify({
              status: 'success',
              memories
            }), { headers })

          default:
            return new Response(JSON.stringify({ status: 'error', message: 'Unknown memory action' }), { headers })
        }

      case 'execute':
        // Execute a task (placeholder for actual agent logic)
        await supabase.from('agent_logs').insert({
          level: 'info',
          source: 'agent-core',
          message: `Task executed: ${task}`,
          context: { task, payload, context }
        })

        return new Response(JSON.stringify({
          status: 'success',
          task,
          message: `Task "${task}" completed`,
          result: { executed: true, timestamp: new Date().toISOString() }
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
