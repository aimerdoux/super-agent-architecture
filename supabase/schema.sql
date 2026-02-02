-- =====================================================
-- SUPER AGENT SELF-UPGRADING SYSTEM - Supabase Schema
-- =====================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";
CREATE EXTENSION IF NOT EXISTS "pg_net";

-- =====================================================
-- CORE TABLES
-- =====================================================

-- Agent state tracking
CREATE TABLE IF NOT EXISTS agent_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL DEFAULT 'super-agent',
    version TEXT NOT NULL,
    commit_sha TEXT,
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    config JSONB DEFAULT '{}',
    status TEXT DEFAULT 'initializing' CHECK (status IN ('running', 'stopped', 'updating', 'error')),
    health_check TIMESTAMPTZ DEFAULT NOW(),
    last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Memory storage (multi-tier)
CREATE TABLE IF NOT EXISTS agent_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('short-term', 'working', 'long-term')),
    category TEXT,
    embedding VECTOR(768),
    importance_score DECIMAL(3,2) DEFAULT 0.5,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ,
    INDEX idx_tier_created (tier, created_at DESC),
    INDEX idx_category (category),
    INDEX USING HNSW (embedding vector_cosine_ops) WITH (m = 16, ef_construction = 64)
);

-- Scheduled tasks (agent-managed cron)
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    cron_expression TEXT NOT NULL,
    task_type TEXT NOT NULL CHECK (task_type IN ('trigger', 'health_check', 'memory_cleanup', 'upgrade_check', 'custom')),
    payload JSONB NOT NULL DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ,
    last_result JSONB,
    error_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name)
);

-- Self-upgrade history
CREATE TABLE IF NOT EXISTS upgrade_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_version TEXT NOT NULL,
    to_version TEXT NOT NULL,
    commit_sha TEXT,
    status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'success', 'failed', 'rolled_back')),
    changelog TEXT,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    error_message TEXT,
    rollback_commit_sha TEXT
);

-- System logs
CREATE TABLE IF NOT EXISTS agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL CHECK (level IN ('debug', 'info', 'warn', 'error', 'critical')),
    source TEXT,
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    request_id UUID,
    agent_id UUID REFERENCES agent_state(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    INDEX idx_level_created (level, created_at DESC),
    INDEX idx_agent (agent_id, created_at DESC)
);

-- Skills registry (agent's self-knowledge)
CREATE TABLE IF NOT EXISTS skills_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name TEXT NOT NULL UNIQUE,
    version TEXT NOT NULL,
    description TEXT,
    capabilities JSONB DEFAULT '[]',
    dependencies JSONB DEFAULT '[]',
    config JSONB DEFAULT '{}',
    proficiency TEXT DEFAULT 'learning' CHECK (proficiency IN ('learning', 'developing', 'proficient', 'expert')),
    last_used TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0,
    performance_metrics JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Triggers registry
CREATE TABLE IF NOT EXISTS triggers_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    trigger_type TEXT NOT NULL CHECK (trigger_type IN ('schedule', 'condition', 'event', 'webhook')),
    condition_expression TEXT,
    action_type TEXT NOT NULL,
    action_payload JSONB NOT NULL,
    priority INTEGER DEFAULT 5,
    enabled BOOLEAN DEFAULT true,
    cooldown_seconds INTEGER DEFAULT 60,
    last_triggered TIMESTAMPTZ,
    trigger_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- FUNCTIONS
-- =====================================================

-- Heartbeat function
CREATE OR REPLACE FUNCTION record_heartbeat(
    p_agent_id UUID,
    p_status TEXT DEFAULT 'running'
) RETURNS VOID AS $$
BEGIN
    UPDATE agent_state 
    SET last_heartbeat = NOW(), 
        status = p_status,
        health_check = NOW()
    WHERE id = p_agent_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Schedule task from cron expression
CREATE OR REPLACE FUNCTION schedule_task(
    p_name TEXT,
    p_cron TEXT,
    p_task_type TEXT,
    p_payload JSONB
) RETURNS UUID AS $$
DECLARE
    v_task_id UUID;
BEGIN
    INSERT INTO scheduled_tasks (name, cron_expression, task_type, payload, next_run)
    VALUES (p_name, p_cron, p_task_type, p_payload, NOW())
    RETURNING id INTO v_task_id;
    
    RETURN v_task_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Log with context
CREATE OR REPLACE FUNCTION log_event(
    p_level TEXT,
    p_message TEXT,
    p_source TEXT DEFAULT 'system',
    p_context JSONB DEFAULT '{}'::jsonb,
    p_agent_id UUID DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    INSERT INTO agent_logs (level, source, message, context, agent_id)
    VALUES (p_level, p_source, p_message, p_context, p_agent_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Memory cleanup (run daily)
CREATE OR REPLACE FUNCTION cleanup_expired_memories() RETURNS INTEGER AS $$
DECLARE
    v_deleted INTEGER;
BEGIN
    DELETE FROM agent_memories WHERE expires_at < NOW();
    GET DIAGNOSTICS v_deleted = ROW_COUNT;
    PERFORM log_event('info', 'Cleaned up ' || v_deleted || ' expired memories', 'memory');
    RETURN v_deleted;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Record upgrade
CREATE OR REPLACE FUNCTION record_upgrade(
    p_from_version TEXT,
    p_to_version TEXT,
    p_commit_sha TEXT,
    p_changelog TEXT
) RETURNS UUID AS $$
DECLARE
    v_upgrade_id UUID;
BEGIN
    INSERT INTO upgrade_history (from_version, to_version, commit_sha, changelog, status)
    VALUES (p_from_version, p_to_version, p_commit_sha, p_changelog, 'in_progress')
    RETURNING id INTO v_upgrade_id;
    
    RETURN v_upgrade_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Complete upgrade
CREATE OR REPLACE FUNCTION complete_upgrade(
    p_upgrade_id UUID,
    p_success BOOLEAN,
    p_error_message TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
    UPDATE upgrade_history 
    SET status = CASE WHEN p_success THEN 'success' ELSE 'failed' END,
        completed_at = NOW(),
        error_message = p_error_message
    WHERE id = p_upgrade_id;
    
    -- Update agent version if successful
    IF p_success THEN
        UPDATE agent_state SET version = (SELECT to_version FROM upgrade_history WHERE id = p_upgrade_id);
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- INITIAL DATA
-- =====================================================

-- Insert default agent state
INSERT INTO agent_state (agent_name, version, status)
VALUES ('super-agent', '1.0.0', 'running')
ON CONFLICT DO NOTHING;

-- Register core skills
INSERT INTO skills_registry (skill_name, version, description, capabilities)
VALUES 
    ('memory-manager', '1.0.0', 'Multi-tier memory orchestration', '["memory_store", "memory_recall", "memory_synthesize"]'),
    ('proactive-agent', '1.0.0', 'Self-triggered autonomous actions', '["trigger_add", "trigger_check", "action_execute"]'),
    ('browser-mastery', '1.0.0', 'Advanced browser automation', '["browser_multi_tab", "browser_anti_detect", "browser_data_extractor"]'),
    ('code-super', '1.0.0', 'Full-stack code generation', '["code_generate", "code_deploy", "code_review_advanced"]'),
    ('meta-cognition', '1.0.0', 'Self-modeling and prediction', '["meta_monitor", "meta_predict", "meta_optimize"]'),
    ('research-agent', '1.0.0', 'Deep research and synthesis', '["research_deep", "research_synthesize", "hypothesis_generate"]'),
    ('self-upgrade', '1.0.0', 'Self-upgrading capability', '["check_updates", "upgrade", "deploy", "health_check"]')
ON CONFLICT DO NOTHING;

-- =====================================================
-- DEFAULT SCHEDULED TASKS
-- =====================================================

-- Health check every 5 minutes
INSERT INTO scheduled_tasks (name, description, cron_expression, task_type, payload, priority)
VALUES (
    'agent-health-check',
    'Record agent health status',
    '*/5 * * * *',
    'health_check',
    '{"action": "heartbeat"}'::jsonb,
    10
) ON CONFLICT DO NOTHING;

-- Memory cleanup daily at 3 AM
INSERT INTO scheduled_tasks (name, description, cron_expression, task_type, payload, priority)
VALUES (
    'daily-memory-cleanup',
    'Clean up expired and low-value memories',
    '0 3 * * *',
    'memory_cleanup',
    '{"action": "cleanup", "keep_long_term": true}'::jsonb,
    3
) ON CONFLICT DO NOTHING;

-- Upgrade check every 6 hours
INSERT INTO scheduled_tasks (name, description, cron_expression, task_type, payload, priority)
VALUES (
    'upgrade-check',
    'Check for new versions',
    '0 */6 * * *',
    'upgrade_check',
    '{"action": "check", "auto_upgrade": false}'::jsonb,
    5
) ON CONFLICT DO NOTHING;

-- Short-term memory consolidation every hour
INSERT INTO scheduled_tasks (name, description, cron_expression, task_type, payload, priority)
VALUES (
    'memory-consolidation',
    'Move important short-term memories to long-term',
    '0 * * * *',
    'custom',
    '{"action": "consolidate", "threshold": 0.7}'::jsonb,
    4
) ON CONFLICT DO NOTHING;

-- =====================================================
-- RLS POLICIES (Row Level Security)
-- =====================================================

ALTER TABLE agent_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills_registry ENABLE ROW LEVEL SECURITY;

-- Allow service role full access (for Edge Functions)
CREATE POLICY "Service role full access" ON agent_state
    USING (true) WITH CHECK (true);

CREATE POLICY "Service role logs access" ON agent_logs
    USING (true) WITH CHECK (true);

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE agent_state IS 'Tracks overall agent status, version, and health';
COMMENT ON TABLE agent_memories IS 'Multi-tier memory storage with embeddings for RAG';
COMMENT ON TABLE scheduled_tasks IS 'Agent-managed cron jobs for autonomous operation';
COMMENT ON TABLE upgrade_history IS 'Complete history of self-upgrades with rollback support';
COMMENT ON TABLE skills_registry IS 'Self-knowledge of agent capabilities and proficiency';
COMMENT ON TABLE triggers_registry IS 'Event-driven triggers for proactive behavior';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Self-Upgrading Agent Schema Installed Successfully!';
    RAISE NOTICE '📊 Tables: agent_state, agent_memories, scheduled_tasks, upgrade_history, agent_logs, skills_registry, triggers_registry';
    RAISE NOTICE '🔧 Functions: record_heartbeat, schedule_task, log_event, cleanup_expired_memories, record_upgrade, complete_upgrade';
    RAISE NOTICE '⏰ Default tasks: health-check (5min), memory-cleanup (3am), upgrade-check (6hrs), memory-consolidation (hourly)';
END $$;
