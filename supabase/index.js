/**
 * Supabase Client for OpenClaw Cloud Integration
 * 
 * Provides database access for:
 * - Agent state management
 * - Session history
 * - Vector memory embeddings
 * - Workflow definitions
 */

const { createClient } = require('@supabase/supabase-js');

// Environment variables (set in GitHub Actions or local .env)
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY;

// Initialize client
const supabase = createClient(supabaseUrl, supabaseKey);

// =============================================================================
// AGENT MANAGEMENT
// =============================================================================

async function createAgent(name, type, config = {}) {
  const { data, error } = await supabase
    .from('agents')
    .insert({ name, type, config })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function getAgent(id) {
  const { data, error } = await supabase
    .from('agents')
    .select('*')
    .eq('id', id)
    .single();
  
  if (error) throw error;
  return data;
}

async function updateAgentStatus(id, status) {
  const { data, error } = await supabase
    .from('agents')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

async function createSession(agentId, input = {}) {
  const { data, error } = await supabase
    .from('agent_sessions')
    .insert({ agent_id: agentId, input, status: 'pending' })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function completeSession(sessionId, output) {
  const { data, error } = await supabase
    .from('agent_sessions')
    .update({ 
      output, 
      status: 'completed',
      completed_at: new Date().toISOString() 
    })
    .eq('id', sessionId)
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function getAgentSessions(agentId, limit = 10) {
  const { data, error } = await supabase
    .from('agent_sessions')
    .select('*')
    .eq('agent_id', agentId)
    .order('started_at', { ascending: false })
    .limit(limit);
  
  if (error) throw error;
  return data;
}

// =============================================================================
// VECTOR MEMORY
// =============================================================================

async function storeMemory(content, metadata = {}, embedding = null) {
  const { data, error } = await supabase
    .from('memory_embeddings')
    .insert({ content, metadata, embedding })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function searchMemories(queryEmbedding, limit = 5) {
  // Using Supabase's pgvector for similarity search
  const { data, error } = await supabase
    .rpc('match_memories', {
      query_embedding: queryEmbedding,
      match_threshold: 0.7,
      match_count: limit
    });
  
  if (error) throw error;
  return data;
}

async function searchMemoriesByText(queryText, limit = 5) {
  // Fallback: text search if embedding not available
  const { data, error } = await supabase
    .from('memory_embeddings')
    .select('*')
    .ilike('content', `%${queryText}%`)
    .limit(limit);
  
  if (error) throw error;
  return data;
}

// =============================================================================
// WORKFLOWS
// =============================================================================

async function createWorkflow(name, definition, trigger = null) {
  const { data, error } = await supabase
    .from('workflows')
    .insert({ name, definition, trigger })
    .select()
    .single();
  
  if (error) throw error;
  return data;
}

async function runWorkflow(workflowId, context = {}) {
  // Create workflow run
  const { data: run, error: runError } = await supabase
    .from('workflow_runs')
    .insert({ workflow_id: workflowId, status: 'running', context })
    .select()
    .single();
  
  if (runError) throw runError;
  
  // Execute workflow (simplified - extend as needed)
  const { data: workflow, error: wfError } = await supabase
    .from('workflows')
    .select('*')
    .eq('id', workflowId)
    .single();
  
  if (wfError) {
    await supabase
      .from('workflow_runs')
      .update({ status: 'failed', completed_at: new Date().toISOString() })
      .eq('id', run.id);
    throw wfError;
  }
  
  // Execute steps
  const steps = workflow.definition.steps || [];
  const results = [];
  
  for (const step of steps) {
    // Execute step (placeholder - implement step execution)
    results.push({ step: step.name, result: 'pending' });
  }
  
  // Mark complete
  await supabase
    .from('workflow_runs')
    .update({ 
      status: 'completed', 
      result: { steps: results },
      completed_at: new Date().toISOString() 
    })
    .eq('id', run.id);
  
  return run;
}

// =============================================================================
// SYNC UTILITIES
// =============================================================================

async function syncToCloud(localData, table) {
  const { data, error } = await supabase
    .from(table)
    .upsert(localData)
    .select();
  
  if (error) throw error;
  return data;
}

async function syncFromCloud(table, conditions = {}) {
  let query = supabase.from(table).select('*');
  
  for (const [key, value] of Object.entries(conditions)) {
    query = query.eq(key, value);
  }
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

// =============================================================================
// EXPORTS
// =============================================================================

module.exports = {
  supabase,
  // Agent
  createAgent,
  getAgent,
  updateAgentStatus,
  // Sessions
  createSession,
  completeSession,
  getAgentSessions,
  // Memory
  storeMemory,
  searchMemories,
  searchMemoriesByText,
  // Workflows
  createWorkflow,
  runWorkflow,
  // Sync
  syncToCloud,
  syncFromCloud
};
