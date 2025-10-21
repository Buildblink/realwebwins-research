-- Create pain_points table for Pain Point Explorer
-- Run this in Supabase SQL Editor if the automatic script fails

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'pain_points'
  ) THEN
    CREATE TABLE public.pain_points (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      text text NOT NULL,
      category text,
      niche text,
      source text,
      frequency int DEFAULT 1,
      proof_link text,
      related_case_id uuid REFERENCES public.research_projects(id) ON DELETE SET NULL,
      related_playbook text,
      last_seen timestamptz DEFAULT now(),
      created_at timestamptz DEFAULT now()
    );

    -- Create indexes for fast filtering
    CREATE INDEX idx_pain_points_category ON public.pain_points(category);
    CREATE INDEX idx_pain_points_niche ON public.pain_points(niche);
    CREATE INDEX idx_pain_points_source ON public.pain_points(source);
    CREATE INDEX idx_pain_points_frequency ON public.pain_points(frequency DESC);
    CREATE INDEX idx_pain_points_last_seen ON public.pain_points(last_seen DESC);

    -- Create full-text search index on text column
    CREATE INDEX idx_pain_points_text_search ON public.pain_points USING gin(to_tsvector('english', text));

    -- Enable Row Level Security
    ALTER TABLE public.pain_points ENABLE ROW LEVEL SECURITY;

    -- Create RLS policies
    -- Public read access
    CREATE POLICY "Allow public read access"
      ON public.pain_points
      FOR SELECT
      USING (true);

    -- Service role write access
    CREATE POLICY "Allow service role inserts"
      ON public.pain_points
      FOR INSERT
      TO service_role
      WITH CHECK (true);

    CREATE POLICY "Allow service role updates"
      ON public.pain_points
      FOR UPDATE
      TO service_role
      USING (true)
      WITH CHECK (true);

    CREATE POLICY "Allow service role deletes"
      ON public.pain_points
      FOR DELETE
      TO service_role
      USING (true);

  END IF;
END
$$;

-- Verify table was created
SELECT 'pain_points table created successfully!' as status;
SELECT COUNT(*) as row_count FROM public.pain_points;
