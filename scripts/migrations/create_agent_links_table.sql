-- Phase 20: Agent Link Relationships
CREATE TABLE IF NOT EXISTS agent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_agent text NOT NULL,
  target_agent text NOT NULL,
  relationship text DEFAULT 'peer',
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE agent_links IS 'Graph relationships between autonomous agents.';

CREATE INDEX IF NOT EXISTS idx_agent_links_source_target
  ON agent_links (source_agent, target_agent);
