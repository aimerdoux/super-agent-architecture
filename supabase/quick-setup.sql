-- SUPER AGENT - QUICK SETUP SQL
-- Copy-paste into Supabase SQL Editor
-- https://supabase.com/dashboard/project/xnzxnhlwabbhnxjxwwyn/sql

-- 1. Enable extensions (pgvector not available, skipping)
-- CREATE EXTENSION IF NOT EXISTS "pg_cron"; -- Uncomment if available
-- CREATE EXTENSION IF NOT EXISTS "pgvector";

-- 2. Agent state table
CREATE TABLE IF NOT EXISTS agent_state (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    agent_name TEXT NOT NULL DEFAULT 'super-agent',
    version TEXT NOT NULL DEFAULT '1.0.0',
    last_updated TIMESTAMPTZ DEFAULT NOW(),
    config JSONB DEFAULT '{}',
    status TEXT DEFAULT 'running',
    health_check TIMESTAMPTZ DEFAULT NOW(),
    last_heartbeat TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Memory table (without embeddings for now)
CREATE TABLE IF NOT EXISTS agent_memories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content TEXT NOT NULL,
    tier TEXT NOT NULL CHECK (tier IN ('short-term', 'working', 'long-term')),
    category TEXT,
    importance_score DECIMAL(3,2) DEFAULT 0.5,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ
);

-- 4. Scheduled tasks
CREATE TABLE IF NOT EXISTS scheduled_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    cron_expression TEXT NOT NULL,
    task_type TEXT NOT NULL,
    payload JSONB DEFAULT '{}',
    enabled BOOLEAN DEFAULT true,
    last_run TIMESTAMPTZ,
    next_run TIMESTAMPTZ
);

-- 5. Upgrade history
CREATE TABLE IF NOT EXISTS upgrade_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_version TEXT NOT NULL,
    to_version TEXT NOT NULL,
    status TEXT NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 6. System logs
CREATE TABLE IF NOT EXISTS agent_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    level TEXT NOT NULL,
    source TEXT,
    message TEXT NOT NULL,
    context JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Skills registry
CREATE TABLE IF NOT EXISTS skills_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    skill_name TEXT NOT NULL UNIQUE,
    version TEXT NOT NULL,
    description TEXT,
    capabilities JSONB DEFAULT '[]',
    proficiency TEXT DEFAULT 'learning',
    last_used TIMESTAMPTZ,
    usage_count INTEGER DEFAULT 0
);

-- 8. Insert default agent state
INSERT INTO agent_state (agent_name, version, status)
VALUES ('super-agent', '1.0.0', 'running')
ON CONFLICT DO NOTHING;

-- 9. Register core skills
INSERT INTO skills_registry (skill_name, version, description, capabilities)
VALUES 
    ('memory-manager', '1.0.0', 'Multi-tier memory', '["store", "recall"]'),
    ('proactive-agent', '1.0.0', 'Self-triggered actions', '["trigger", "schedule"]'),
    ('browser-mastery', '1.0.0', 'Browser automation', '["navigate", "extract"]'),
    ('code-super', '1.0.0', 'Code generation', '["generate", "deploy"]'),
    ('meta-cognition', '1.0.0', 'Self-improvement', '["monitor", "optimize"]'),
    ('self-upgrade', '1.0.0', 'Self-upgrading', '["check", "upgrade", "deploy"]')
ON CONFLICT DO NOTHING;

-- 10. Default scheduled tasks
INSERT INTO scheduled_tasks (name, cron_expression, task_type, payload)
VALUES 
    ('health-check', '*/5 * * * *', 'health_check', '{"action": "heartbeat"}'),
    ('upgrade-check', '0 */6 * * *', 'upgrade_check', '{"action": "check"}'),
    ('memory-cleanup', '0 3 * * *', 'memory_cleanup', '{"action": "cleanup"}')
ON CONFLICT DO NOTHING;

-- 11. Helper functions
CREATE OR REPLACE FUNCTION record_heartbeat()
RETURNS VOID AS $$
BEGIN
    UPDATE agent_state SET health_check = NOW(), last_heartbeat = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION log_event(p_level TEXT, p_message TEXT, p_source TEXT DEFAULT 'system')
RETURNS VOID AS $$
BEGIN
    INSERT INTO agent_logs (level, source, message) VALUES (p_level, p_source, p_message);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

SELECT '✅ Super Agent Database Ready!' AS status;
