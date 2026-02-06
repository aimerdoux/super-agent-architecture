-- Memory Sync Schema for Supabase
-- Run this in Supabase SQL Editor to enable vector memory search

-- Enable vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create memory_embeddings table (if not exists)
CREATE TABLE IF NOT EXISTS memory_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL,
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create IVFFlat index for fast similarity search
CREATE INDEX IF NOT EXISTS embedding_idx
ON memory_embeddings
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create match_memories function for semantic search
CREATE OR REPLACE FUNCTION match_memories(
  query_embedding VECTOR(1536),
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  content TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.content,
    1 - (m.embedding <=> query_embedding) AS similarity
  FROM memory_embeddings m
  WHERE 1 - (m.embedding <=> query_embedding) > match_threshold
  ORDER BY m.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Enable RLS for security
ALTER TABLE memory_embeddings ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to read memories
CREATE POLICY "Enable read access for authenticated users"
ON memory_embeddings
FOR SELECT
TO authenticated
USING (true);

-- Create policy for authenticated users to insert memories
CREATE POLICY "Enable insert for authenticated users"
ON memory_embeddings
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Create policy for authenticated users to update memories
CREATE POLICY "Enable update for authenticated users"
ON memory_embeddings
FOR UPDATE
TO authenticated
USING (true);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS updated_at_trigger ON memory_embeddings;
CREATE TRIGGER updated_at_trigger
  BEFORE UPDATE ON memory_embeddings
  FOR EACH ROW
  EXECUTE FUNCTION update_modified_column();

-- Index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS created_at_idx ON memory_embeddings(created_at DESC);

-- Index on metadata for filtering
CREATE INDEX IF NOT EXISTS metadata_idx ON memory_embeddings USING gin(metadata jsonb_path_ops);

-- Grant permissions to service role (bypasses RLS)
ALTER TABLE memory_embeddings OWNER TO postgres;

-- Comments for documentation
COMMENT ON TABLE memory_embeddings IS 'Vector embeddings for memory search with metadata';
COMMENT ON FUNCTION match_memories IS 'Find similar memories using cosine similarity search';

-- Verify setup
SELECT 
  'Vector extension' AS status,
  CASE WHEN extname = 'vector' THEN '✅ Enabled' ELSE '❌ Missing' END AS result
FROM pg_extension 
WHERE extname = 'vector';

SELECT 
  'Table exists' AS status,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'memory_embeddings') 
  THEN '✅' ELSE '❌' END AS result;

SELECT 
  'Index created' AS status,
  CASE WHEN EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'embedding_idx') 
  THEN '✅' ELSE '❌' END AS result;
