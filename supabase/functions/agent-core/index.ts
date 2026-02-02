// Agent Core Edge Function - Main agent logic
// supabase/functions/agent-core/index.ts

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface AgentRequest {
  action: 'execute' | 'status' | 'restart' | 'configure' | 'memory' | 'chat';
  task?: string;
  message?: string;
  payload?: Record<string, unknown>;
  context?: Record<string, unknown>;
}

async function callLLM(messages: Array<{role: string, content: string}>, memories: string[]): Promise<string> {
  const apiKey = Deno.env.get('MINIMAX_API_KEY')!
  const systemPrompt = `You are Super Agent, an autonomous AI agent running on Supabase Edge Functions. You have persistent memory and can self-upgrade your own code via GitHub.

Your capabilities:
- Store and recall memories across conversations
- Check your own status and health
- Self-upgrade by pulling latest code from GitHub
- Execute tasks autonomously

${memories.length > 0 ? `Your relevant memories:\n${memories.join('\n')}` : 'No memories stored yet.'}

Be helpful, concise, and proactive. You are always running in the cloud.`

  const res = await fetch('https://api.minimax.io/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'MiniMax-M1',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages,
      ],
      max_tokens: 1024,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`MiniMax API error: ${res.status} ${err}`)
  }

  const data = await res.json()
  return data.choices[0].message.content
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

      case 'chat': {
        // Chat with the agent using AI
        const userMessage = payload?.message as string || task || ''
        if (!userMessage) {
          return new Response(JSON.stringify({ status: 'error', message: 'No message provided' }), { headers })
        }

        // Recall recent memories for context
        const { data: recentMemories } = await supabase
          .from('agent_memories')
          .select('content, tier')
          .order('created_at', { ascending: false })
          .limit(10)

        const memoryStrings = (recentMemories || []).map((m: { content: string, tier: string }) => `[${m.tier}] ${m.content}`)

        const reply = await callLLM(
          [{ role: 'user', content: userMessage }],
          memoryStrings
        )

        // Log the conversation
        try {
          await supabase.from('agent_logs').insert({
            level: 'info',
            source: 'agent-core',
            message: `Chat: ${userMessage.slice(0, 100)}`,
            context: { user_message: userMessage, agent_reply: reply }
          })
        } catch {}

        return new Response(JSON.stringify({
          status: 'success',
          reply,
          memories_used: memoryStrings.length
        }), { headers })
      }

      case 'execute': {
        // Execute a task with AI reasoning
        const taskDesc = task || payload?.task as string || ''

        const { data: taskMemories } = await supabase
          .from('agent_memories')
          .select('content, tier')
          .order('created_at', { ascending: false })
          .limit(5)

        const mems = (taskMemories || []).map((m: { content: string, tier: string }) => `[${m.tier}] ${m.content}`)

        const result = await callLLM(
          [{ role: 'user', content: `Execute this task and provide the result:\n\n${taskDesc}\n\nContext: ${JSON.stringify(context || {})}` }],
          mems
        )

        await supabase.from('agent_logs').insert({
          level: 'info',
          source: 'agent-core',
          message: `Task executed: ${taskDesc.slice(0, 100)}`,
          context: { task: taskDesc, result }
        })

        return new Response(JSON.stringify({
          status: 'success',
          task: taskDesc,
          result
        }), { headers })
      }

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
