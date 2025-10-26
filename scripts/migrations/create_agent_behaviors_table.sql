-- Phase 22: Autonomous agent behavior registry
CREATE TABLE IF NOT EXISTS agent_behaviors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  trigger_type text NOT NULL,
  action text NOT NULL,
  status text DEFAULT 'idle',
  last_run timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agent_behaviors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service insert"
  ON agent_behaviors
  FOR INSERT
  USING (true);

COMMENT ON TABLE agent_behaviors IS 'Configured autonomous behaviors that agents execute on a schedule or trigger.';
COMMENT ON COLUMN agent_behaviors.trigger_type IS 'daily | event | manual | cron';
COMMENT ON COLUMN agent_behaviors.action IS 'Action identifier (e.g., analyze_pain_points, sync_memory).';
