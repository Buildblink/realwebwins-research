-- Phase 23: Shared agent memory store
CREATE TABLE IF NOT EXISTS agent_memory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  topic text NOT NULL,
  content text NOT NULL,
  relevance numeric DEFAULT 1.0,
  last_updated timestamptz DEFAULT now()
);

ALTER TABLE agent_memory ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_agent_memory_topic
  ON agent_memory (topic);

COMMENT ON TABLE agent_memory IS 'Shared memory knowledge base synchronized between agents.';
