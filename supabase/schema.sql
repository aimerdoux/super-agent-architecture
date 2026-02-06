{
  "$schema": "https://supabase.com/schema.json",
  "tables": [
    {
      "name": "agents",
      "description": "AI agent instances",
      "columns": [
        {"name": "id", "type": "uuid", "primary_key": true, "default": "gen_random_uuid()"},
        {"name": "name", "type": "text", "not_null": true},
        {"name": "type", "type": "text", "not_null": true},
        {"name": "config", "type": "jsonb"},
        {"name": "status", "type": "text", "default": "active"},
        {"name": "created_at", "type": "timestamp", "default": "now()"},
        {"name": "updated_at", "type": "timestamp", "default": "now()"}
      ],
      "indexes": ["type", "status"],
      "policies": [
        {
          "name": "Enable read access for authenticated users",
          "operation": "SELECT",
          "role": "authenticated"
        },
        {
          "name": "Enable insert for authenticated users",
          "operation": "INSERT",
          "role": "authenticated"
        }
      ]
    },
    {
      "name": "agent_sessions",
      "description": "Agent execution sessions",
      "columns": [
        {"name": "id", "type": "uuid", "primary_key": true, "default": "gen_random_uuid()"},
        {"name": "agent_id", "type": "uuid", "references": "agents(id)", "not_null": true},
        {"name": "status", "type": "text", "default": "pending"},
        {"name": "input", "type": "jsonb"},
        {"name": "output", "type": "jsonb"},
        {"name": "started_at", "type": "timestamp", "default": "now()"},
        {"name": "completed_at", "type": "timestamp"}
      ],
      "indexes": ["agent_id", "status"]
    },
    {
      "name": "memory_embeddings",
      "description": "Vector embeddings for memory search",
      "columns": [
        {"name": "id", "type": "uuid", "primary_key": true, "default": "gen_random_uuid()"},
        {"name": "content", "type": "text", "not_null": true},
        {"name": "embedding", "type": "vector(1536)"},
        {"name": "metadata", "type": "jsonb"},
        {"name": "created_at", "type": "timestamp", "default": "now()"}
      ],
      "indexes": [
        {
          "name": "embedding_idx",
          "type": "ivfflat",
          "columns": [{"name": "embedding", "distance": "cosine"}]
        }
      ]
    },
    {
      "name": "workflows",
      "description": "Workflow definitions",
      "columns": [
        {"name": "id", "type": "uuid", "primary_key": true, "default": "gen_random_uuid()"},
        {"name": "name", "type": "text", "not_null": true},
        {"name": "definition", "type": "jsonb", "not_null": true},
        {"name": "trigger", "type": "text"},
        {"name": "created_by", "type": "text"},
        {"name": "created_at", "type": "timestamp", "default": "now()"}
      ]
    },
    {
      "name": "workflow_runs",
      "description": "Workflow execution history",
      "columns": [
        {"name": "id", "type": "uuid", "primary_key": true, "default": "gen_random_uuid()"},
        {"name": "workflow_id", "type": "uuid", "references": "workflows(id)", "not_null": true},
        {"name": "status", "type": "text", "default": "running"},
        {"name": "result", "type": "jsonb"},
        {"name": "started_at", "type": "timestamp", "default": "now()"},
        {"name": "completed_at", "type": "timestamp"}
      ],
      "indexes": ["workflow_id", "status"]
    }
  ],
  "functions": [
    {
      "name": "match_memories",
      "description": "Find similar memories using vector search",
      "returns": "TABLE(id uuid, content text, similarity float)"
    }
  ],
  "triggers": [
    {
      "name": "updated_at_trigger",
      "table": "agents",
      "operation": "UPDATE",
      "function": "update_modified_column"
    }
  ]
}
