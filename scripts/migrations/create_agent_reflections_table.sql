-- Phase 24: Agent reflections summary log
CREATE TABLE IF NOT EXISTS agent_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  behavior_id uuid,
  reflection_type text DEFAULT 'auto',
  summary text NOT NULL,
  content text,
  confidence numeric DEFAULT 0.9,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE agent_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow service insert"
  ON agent_reflections
  FOR INSERT
  USING (auth.role() = 'service_role');

CREATE INDEX IF NOT EXISTS idx_agent_reflections_agent_created
  ON agent_reflections (agent_id, created_at DESC);
