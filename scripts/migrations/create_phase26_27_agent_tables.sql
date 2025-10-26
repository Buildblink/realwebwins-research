-- Phase 26-27: Ensure agent_metrics and agent_links exist with compatible columns

CREATE TABLE IF NOT EXISTS public.agent_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  average_impact numeric DEFAULT 0,
  consistency numeric DEFAULT 0,
  reflection_count integer DEFAULT 0,
  behavior_count integer DEFAULT 0,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  -- additional rollup columns requested in latest spec
  total_runs integer DEFAULT 0,
  success_rate numeric DEFAULT 0,
  impact_avg numeric DEFAULT 0,
  impact_variance numeric DEFAULT 0,
  reflections integer DEFAULT 0,
  behaviors integer DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_agent_metrics_agent_id
  ON public.agent_metrics (agent_id);

COMMENT ON TABLE public.agent_metrics IS 'Aggregated performance metrics for autonomous agents.';

CREATE TABLE IF NOT EXISTS public.agent_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_agent text NOT NULL,
  target_agent text NOT NULL,
  collaboration_type text DEFAULT 'relay',
  relation_type text DEFAULT 'support',
  strength numeric DEFAULT 0.5,
  weight numeric DEFAULT 1.0,
  context jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.agent_links
  DROP CONSTRAINT IF EXISTS agent_links_collaboration_type_check;

ALTER TABLE public.agent_links
  ADD CONSTRAINT agent_links_collaboration_type_check
  CHECK (collaboration_type IN ('relay', 'assist', 'analyze'));

CREATE INDEX IF NOT EXISTS idx_agent_links_source_target
  ON public.agent_links (source_agent, target_agent);

COMMENT ON TABLE public.agent_links IS 'Collaboration graph for cross-agent triggers.';

NOTIFY pgrst, 'reload schema';
