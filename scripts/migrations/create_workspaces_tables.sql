-- Create workspaces and workspace_outputs tables for Phase 12 Interactive Workspace
-- Run this in Supabase SQL Editor if the automatic script fails

DO $$
BEGIN
  -- Create workspaces table if it does not exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'workspaces'
  ) THEN
    CREATE TABLE public.workspaces (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      pain_point_id uuid NOT NULL REFERENCES public.pain_points(id) ON DELETE CASCADE,
      title text NOT NULL,
      status text DEFAULT 'active',
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    CREATE UNIQUE INDEX ux_workspaces_pain_point_id ON public.workspaces(pain_point_id);

    -- Enable Row Level Security
    ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

    -- Public read access (cached content is safe to display)
    CREATE POLICY "Allow public read access"
      ON public.workspaces
      FOR SELECT
      USING (true);

    -- Service role write access
    CREATE POLICY "Allow service role inserts"
      ON public.workspaces
      FOR INSERT
      TO service_role
      WITH CHECK (true);

    CREATE POLICY "Allow service role updates"
      ON public.workspaces
      FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "Allow service role deletes"
      ON public.workspaces
      FOR DELETE
      TO service_role
      USING (true);
  END IF;

  -- Create workspace_outputs table if it does not exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'workspace_outputs'
  ) THEN
    CREATE TABLE public.workspace_outputs (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      workspace_id uuid NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
      section text NOT NULL,
      content_md text,
      content_json jsonb,
      model text,
      tokens integer DEFAULT 0,
      cost_usd numeric(8,4) DEFAULT 0,
      created_at timestamptz DEFAULT now(),
      updated_at timestamptz DEFAULT now()
    );

    CREATE UNIQUE INDEX ux_workspace_outputs_workspace_section
      ON public.workspace_outputs(workspace_id, section);

    CREATE INDEX idx_workspace_outputs_created_at
      ON public.workspace_outputs(created_at DESC);

    -- Enable Row Level Security
    ALTER TABLE public.workspace_outputs ENABLE ROW LEVEL SECURITY;

    -- Public read access (workspace outputs are safe for display)
    CREATE POLICY "Allow public read access"
      ON public.workspace_outputs
      FOR SELECT
      USING (true);

    -- Service role write access
    CREATE POLICY "Allow service role inserts"
      ON public.workspace_outputs
      FOR INSERT
      TO service_role
      WITH CHECK (true);

    CREATE POLICY "Allow service role updates"
      ON public.workspace_outputs
      FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "Allow service role deletes"
      ON public.workspace_outputs
      FOR DELETE
      TO service_role
      USING (true);
  END IF;
END
$$;

-- Verification
SELECT 'workspaces table ready' AS workspaces_status;
SELECT 'workspace_outputs table ready' AS workspace_outputs_status;
