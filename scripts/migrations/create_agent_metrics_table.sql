-- Phase 26: Aggregate performance metrics per agent
CREATE TABLE IF NOT EXISTS agent_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  average_impact numeric DEFAULT 0,
  consistency numeric DEFAULT 0,
  last_tune_at timestamptz DEFAULT now(),
  reflection_count integer DEFAULT 0,
  behavior_count integer DEFAULT 0,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE agent_metrics IS 'Rolling performance metrics tracked for each autonomous agent.';

CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_created
  ON agent_metrics (agent_id, created_at DESC);

ALTER TABLE agent_metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service-role full access"
  ON agent_metrics
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

CREATE OR REPLACE FUNCTION set_agent_metrics_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_agent_metrics_updated_at ON agent_metrics;
CREATE TRIGGER trigger_agent_metrics_updated_at
BEFORE UPDATE ON agent_metrics
FOR EACH ROW
EXECUTE FUNCTION set_agent_metrics_updated_at();
