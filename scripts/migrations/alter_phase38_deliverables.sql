-- Phase 38: Interactive Deliverables enhancements

ALTER TABLE public.mvp_artifacts
  ADD COLUMN IF NOT EXISTS preview_html text,
  ADD COLUMN IF NOT EXISTS tier text DEFAULT 'core';

ALTER TABLE public.mvp_exports
  ADD COLUMN IF NOT EXISTS viewed_at timestamptz;

NOTIFY pgrst, 'reload schema';
