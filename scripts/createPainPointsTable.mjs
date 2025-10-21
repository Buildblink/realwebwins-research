import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const summary = {
  alreadyExists: false,
  created: false,
  available: false,
  attempts: 0,
  errors: [],
};

if (!supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function tableExists() {
  const { error } = await supabase.from("pain_points").select("id").limit(1);

  if (!error) {
    return true;
  }

  if (error.code && error.code !== "PGRST205") {
    summary.errors.push({
      step: "preflight-check",
      message: error.message,
      statusCode: error.code,
    });
  }

  return false;
}

async function ensureTable() {
  if (await tableExists()) {
    summary.alreadyExists = true;
    summary.available = true;
    return;
  }

  const ddl = `
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
      PERFORM pg_notify('pgrst', 'reload schema');
    END
    $$;
  `;

  const response = await fetch(`${supabaseUrl}/postgres/v1/query`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: ddl }),
  }).catch((requestError) => {
    summary.errors.push({
      step: "ddl-request",
      message: requestError instanceof Error ? requestError.message : String(requestError),
    });
    return null;
  });

  if (!response) {
    return;
  }

  if (!response.ok) {
    const errorText = await response.text();
    summary.errors.push({
      step: "ddl-request",
      message: errorText || response.statusText,
      statusCode: response.status,
    });
    return;
  }

  summary.created = true;

  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    summary.attempts = attempt + 1;
    if (await tableExists()) {
      summary.available = true;
      return;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(500 * Math.pow(2, attempt), 4000))
    );
  }

  summary.errors.push({
    step: "availability-check",
    message: "Timed out waiting for pain_points to become queryable via PostgREST.",
  });
}

await ensureTable();
console.log(JSON.stringify(summary, null, 2));

if (!summary.available) {
  process.exitCode = 1;
}
