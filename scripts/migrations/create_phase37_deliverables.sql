-- Phase 37: Deliverables, artifacts, and export tracking

ALTER TABLE public.mvp_outputs
  ADD COLUMN IF NOT EXISTS deliverable_mode text DEFAULT 'core',
  ADD COLUMN IF NOT EXISTS artifacts jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS project_files jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS repo_url text,
  ADD COLUMN IF NOT EXISTS deploy_url text;

CREATE TABLE IF NOT EXISTS public.mvp_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mvp_id uuid REFERENCES public.mvp_outputs(id) ON DELETE CASCADE,
  artifact_type text NOT NULL,
  title text,
  format text,
  content jsonb DEFAULT '{}'::jsonb,
  validation_status text DEFAULT 'pending',
  validation_errors jsonb DEFAULT '[]'::jsonb,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mvp_artifacts_mvp_id_idx
  ON public.mvp_artifacts (mvp_id);

CREATE TABLE IF NOT EXISTS public.mvp_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mvp_id uuid REFERENCES public.mvp_outputs(id) ON DELETE CASCADE,
  export_type text NOT NULL,
  tier text DEFAULT 'free',
  download_url text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mvp_exports_mvp_id_idx
  ON public.mvp_exports (mvp_id);

COMMENT ON TABLE public.mvp_artifacts IS 'Stores generated artifacts (code, docs, planners) for each MVP run.';
COMMENT ON TABLE public.mvp_exports IS 'Tracks generated export packages, tier gating, and download metadata.';

NOTIFY pgrst, 'reload schema';
