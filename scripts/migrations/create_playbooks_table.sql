-- Create playbooks table for Playbook Integration (Phase 3)
-- Run this in Supabase SQL Editor if the automatic script fails

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'playbooks'
  ) THEN
    CREATE TABLE public.playbooks (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      title text NOT NULL,
      slug text NOT NULL UNIQUE,
      description text,
      content text,
      category text,
      niche text,
      related_pain_id uuid REFERENCES public.pain_points(id) ON DELETE SET NULL,
      related_case_id uuid REFERENCES public.research_projects(id) ON DELETE SET NULL,
      tools jsonb DEFAULT '[]'::jsonb,
      affiliate_links jsonb DEFAULT '[]'::jsonb,
      created_at timestamptz DEFAULT now()
    );

    -- Create indexes
    CREATE UNIQUE INDEX idx_playbooks_slug ON public.playbooks(slug);
    CREATE INDEX idx_playbooks_category ON public.playbooks(category);
    CREATE INDEX idx_playbooks_niche ON public.playbooks(niche);
    CREATE INDEX idx_playbooks_related_pain ON public.playbooks(related_pain_id);

    -- Enable Row Level Security
    ALTER TABLE public.playbooks ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    -- Public read access
    CREATE POLICY "Allow public read access"
      ON public.playbooks
      FOR SELECT
      USING (true);

    -- Service role write access
    CREATE POLICY "Allow service role inserts"
      ON public.playbooks
      FOR INSERT
      TO service_role
      WITH CHECK (true);

    CREATE POLICY "Allow service role updates"
      ON public.playbooks
      FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "Allow service role deletes"
      ON public.playbooks
      FOR DELETE
      TO service_role
      USING (true);

  END IF;
END
$$;

-- Verify table was created
SELECT 'playbooks table created successfully!' as status;
SELECT COUNT(*) as row_count FROM public.playbooks;
