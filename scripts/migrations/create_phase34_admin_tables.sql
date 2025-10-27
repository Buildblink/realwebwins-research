-- Phase 34: Admin agent configuration tables

CREATE TABLE IF NOT EXISTS public.agent_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  role text,
  prompt text NOT NULL,
  mode text DEFAULT 'relay',
  llm_provider text DEFAULT 'openai',
  llm_model text DEFAULT 'gpt-4o-mini',
  temperature numeric DEFAULT 0.7,
  enabled boolean DEFAULT true,
  version integer DEFAULT 1,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.agent_definitions IS
'Editable registry of AI agents, prompts, and model configuration.';

CREATE TABLE IF NOT EXISTS public.agent_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id uuid REFERENCES public.agent_definitions(id) ON DELETE CASCADE,
  input jsonb,
  output jsonb,
  llm_provider text,
  llm_model text,
  duration_ms integer,
  created_at timestamptz DEFAULT now()
);

COMMENT ON TABLE public.agent_runs IS
'Historical log of prompt executions and LLM responses.';

NOTIFY pgrst, 'reload schema';
