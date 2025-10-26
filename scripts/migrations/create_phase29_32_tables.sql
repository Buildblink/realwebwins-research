-- Phases 29-32: System health, summaries, public leaderboard, auth & credits

-- Phase 29: health observability tables
CREATE TABLE IF NOT EXISTS public.agent_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id text NOT NULL,
  type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'agent_events'
      AND indexname = 'agent_events_agent_id_created_at_idx'
  ) THEN
    CREATE INDEX agent_events_agent_id_created_at_idx
      ON public.agent_events (agent_id, created_at DESC);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.system_health (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  component text NOT NULL,
  status text NOT NULL,
  details jsonb DEFAULT '{}'::jsonb,
  checked_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'system_health'
      AND indexname = 'system_health_component_checked_at_idx'
  ) THEN
    CREATE INDEX system_health_component_checked_at_idx
      ON public.system_health (component, checked_at DESC);
  END IF;
END
$$;

-- Phase 30: weekly summaries
CREATE TABLE IF NOT EXISTS public.weekly_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  week_start date NOT NULL,
  report jsonb DEFAULT '{}'::jsonb,
  markdown text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.weekly_summaries
  ADD COLUMN IF NOT EXISTS markdown text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'weekly_summaries'
      AND indexname = 'weekly_summaries_week_start_idx'
  ) THEN
    CREATE UNIQUE INDEX weekly_summaries_week_start_idx
      ON public.weekly_summaries (week_start);
  END IF;
END
$$;

-- Phase 31: public leaderboard view
CREATE OR REPLACE VIEW public.v_leaderboard AS
SELECT
  agent_id,
  rank_score,
  impact_rank,
  consistency_rank,
  collaboration_rank,
  impact_avg,
  impact_variance,
  collaboration_weight_sum,
  computed_at
FROM public.agent_leaderboard;

-- Phase 32: auth & credits
CREATE TABLE IF NOT EXISTS public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.user_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.user_profiles(id),
  balance integer DEFAULT 100,
  updated_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'user_credits'
      AND column_name = 'balance'
  ) THEN
    ALTER TABLE public.user_credits
      ADD COLUMN balance integer DEFAULT 100;
  END IF;
END
$$;

CREATE OR REPLACE FUNCTION public.set_user_credits_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_user_credits_updated_at
  ON public.user_credits;

CREATE TRIGGER trigger_user_credits_updated_at
BEFORE UPDATE ON public.user_credits
FOR EACH ROW
EXECUTE FUNCTION public.set_user_credits_updated_at();

NOTIFY pgrst, 'reload schema';
