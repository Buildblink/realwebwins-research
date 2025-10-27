-- Phase 35: Admin settings and analytics schema

CREATE TABLE IF NOT EXISTS public.system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value jsonb NOT NULL,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.system_settings (key, value)
VALUES ('llm_provider', '{"provider":"openai","model":"gpt-4o-mini","temperature":0.7}')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.agent_run_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agent_definitions(id) ON DELETE CASCADE,
  llm_provider text,
  llm_model text,
  tokens integer DEFAULT 0,
  duration_ms numeric DEFAULT 0,
  success boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_run_metrics_agent_id
  ON public.agent_run_metrics(agent_id);

COMMENT ON TABLE public.system_settings IS 'Stores global app settings like default LLM provider/model.';
COMMENT ON TABLE public.agent_run_metrics IS 'Per-run telemetry for analytics dashboard.';

NOTIFY pgrst, 'reload schema';
