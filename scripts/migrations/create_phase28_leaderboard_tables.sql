-- Phase 28: Agent Leaderboard + Insight Feed
-- Ensure agent_leaderboard table exists with required columns
CREATE TABLE IF NOT EXISTS public.agent_leaderboard (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  rank_score numeric DEFAULT 0,
  impact_rank integer DEFAULT 0,
  consistency_rank integer DEFAULT 0,
  collaboration_rank integer DEFAULT 0,
  impact_avg numeric DEFAULT 0,
  impact_variance numeric DEFAULT 0,
  collaboration_weight_sum numeric DEFAULT 0,
  computed_at timestamptz DEFAULT now()
);

ALTER TABLE public.agent_leaderboard
  ADD COLUMN IF NOT EXISTS rank_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impact_rank integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS consistency_rank integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS collaboration_rank integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impact_avg numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS impact_variance numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS collaboration_weight_sum numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS computed_at timestamptz DEFAULT now();

CREATE UNIQUE INDEX IF NOT EXISTS agent_leaderboard_agent_id_idx
  ON public.agent_leaderboard (agent_id);

-- Ensure agent_insights table can store leaderboard insights
CREATE TABLE IF NOT EXISTS public.agent_insights (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  insight text,
  metric jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_insights'
      AND column_name = 'insight'
  ) THEN
    ALTER TABLE public.agent_insights ADD COLUMN insight text;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_insights'
      AND column_name = 'metric'
  ) THEN
    ALTER TABLE public.agent_insights ADD COLUMN metric jsonb DEFAULT '{}'::jsonb;
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'agent_insights'
      AND column_name = 'category'
  ) THEN
    ALTER TABLE public.agent_insights ADD COLUMN category text;
  END IF;
END
$$;

CREATE INDEX IF NOT EXISTS agent_insights_agent_id_created_at_idx
  ON public.agent_insights (agent_id, created_at DESC);

COMMENT ON TABLE public.agent_leaderboard IS 'Computed leaderboard scores for autonomous agents.';
COMMENT ON COLUMN public.agent_leaderboard.rank_score IS 'Composite score combining impact, consistency, and collaboration.';

NOTIFY pgrst, 'reload schema';
