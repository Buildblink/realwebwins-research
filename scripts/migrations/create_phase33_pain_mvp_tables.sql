-- Phase 33: Pain Point search and MVP studio tables

CREATE TABLE IF NOT EXISTS public.pain_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  text text NOT NULL,
  summary text,
  category text,
  niche text,
  source text,
  audience text,
  frequency int DEFAULT 1,
  popularity_score numeric DEFAULT 0,
  proof_link text,
  proof_links jsonb DEFAULT '[]'::jsonb,
  related_case_id uuid REFERENCES public.research_projects(id) ON DELETE SET NULL,
  related_playbook text,
  last_seen timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.pain_points
  ADD COLUMN IF NOT EXISTS summary text,
  ADD COLUMN IF NOT EXISTS popularity_score numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS proof_links jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS audience text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'pain_points'
      AND indexname IN ('pain_points_category_idx', 'idx_pain_points_category')
  ) THEN
    CREATE INDEX pain_points_category_idx
      ON public.pain_points USING GIN ((lower(category)));
  END IF;
END
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'pain_points'
      AND indexname IN ('pain_points_summary_search_idx', 'idx_pain_points_text_search')
  ) THEN
    CREATE INDEX pain_points_summary_search_idx
      ON public.pain_points USING GIN (to_tsvector('english', summary));
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.agent_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pain_id uuid REFERENCES public.pain_points(id) ON DELETE CASCADE,
  started_by uuid REFERENCES public.user_profiles(id),
  status text DEFAULT 'running',
  transcript jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'agent_sessions'
      AND indexname = 'agent_sessions_pain_status_idx'
  ) THEN
    CREATE INDEX agent_sessions_pain_status_idx
      ON public.agent_sessions (pain_id, status);
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.mvp_outputs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.agent_sessions(id) ON DELETE CASCADE,
  title text,
  summary text,
  stack text,
  pricing text,
  risk text,
  validation_score numeric,
  download_urls jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'mvp_outputs'
      AND indexname = 'mvp_outputs_session_idx'
  ) THEN
    CREATE INDEX mvp_outputs_session_idx
      ON public.mvp_outputs (session_id);
  END IF;
END
$$;

NOTIFY pgrst, 'reload schema';
