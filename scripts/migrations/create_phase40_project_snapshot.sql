-- Phase 40: Project snapshot for fast previews

CREATE TABLE IF NOT EXISTS public.mvp_project_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mvp_id uuid NOT NULL REFERENCES public.mvp_outputs(id) ON DELETE CASCADE,
  files jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS mvp_project_snapshots_mvp_id_uniq
  ON public.mvp_project_snapshots(mvp_id);

NOTIFY pgrst, 'reload schema';
