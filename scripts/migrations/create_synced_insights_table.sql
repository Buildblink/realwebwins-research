-- Phase 21: Synced Insights Cache
CREATE TABLE IF NOT EXISTS synced_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  related_agent text,
  summary text,
  confidence numeric DEFAULT 0.8,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE synced_insights IS 'Stores periodically synced insights between agents.';

CREATE INDEX IF NOT EXISTS idx_synced_insights_agent_id
  ON synced_insights (agent_id);
