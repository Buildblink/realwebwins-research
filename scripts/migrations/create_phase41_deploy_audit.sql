-- Phase 41: Deployment audit trail

CREATE TABLE IF NOT EXISTS public.mvp_deploys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mvp_id uuid NOT NULL REFERENCES public.mvp_outputs(id) ON DELETE CASCADE,
  user_id uuid,
  provider text NOT NULL,
  status text NOT NULL,
  repo_url text,
  deploy_url text,
  error text,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS mvp_deploys_mvp_id_idx
  ON public.mvp_deploys (mvp_id);

NOTIFY pgrst, 'reload schema';
