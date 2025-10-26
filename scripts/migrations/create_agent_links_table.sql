-- Phase 20 (updated): Agent collaboration links between autonomous agents
CREATE TABLE IF NOT EXISTS agent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_agent text NOT NULL,
  target_agent text NOT NULL,
  collaboration_type text NOT NULL DEFAULT 'relay',
  strength numeric DEFAULT 0.5,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE agent_links IS 'Graph relationships between autonomous agents.';

CREATE INDEX IF NOT EXISTS idx_agent_links_source_target
  ON agent_links (source_agent, target_agent);

ALTER TABLE agent_links
  DROP CONSTRAINT IF EXISTS agent_links_collaboration_type_check;

ALTER TABLE agent_links
  ADD CONSTRAINT agent_links_collaboration_type_check
  CHECK (collaboration_type IN ('relay', 'assist', 'analyze'));
