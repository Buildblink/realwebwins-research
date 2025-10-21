import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const summary = {
  columnsEnsured: false,
  commentsEnsured: false,
  policyEnsured: false,
  errors: [],
};

if (!supabaseUrl) {
  console.error(
    "[ensureResearchRefreshSchema] Missing NEXT_PUBLIC_SUPABASE_URL environment variable."
  );
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error(
    "[ensureResearchRefreshSchema] Missing SUPABASE_SERVICE_ROLE_KEY environment variable."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const postgresQueryUrl = supabaseUrl.endsWith("/")
  ? `${supabaseUrl}postgres/v1/query`
  : `${supabaseUrl}/postgres/v1/query`;

async function ensureColumnsAndComments() {
  console.log(
    `[ensureResearchRefreshSchema] Ensuring columns via ${postgresQueryUrl}`
  );
  const ddl = `
    DO $$
    BEGIN
      BEGIN
        ALTER TABLE public.research_projects
          ADD COLUMN IF NOT EXISTS is_tracked boolean DEFAULT false;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;

      BEGIN
        ALTER TABLE public.research_projects
          ADD COLUMN IF NOT EXISTS last_refreshed_at timestamptz;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;

      BEGIN
        ALTER TABLE public.research_projects
          ADD COLUMN IF NOT EXISTS validation_score integer;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;

      BEGIN
        ALTER TABLE public.research_projects
          ADD COLUMN IF NOT EXISTS validation_snapshot jsonb;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;

      BEGIN
        COMMENT ON COLUMN public.research_projects.is_tracked IS
          'Whether this project participates in scheduled refresh';
      EXCEPTION
        WHEN undefined_column THEN NULL;
      END;

      BEGIN
        COMMENT ON COLUMN public.research_projects.last_refreshed_at IS
          'Timestamp of the most recent auto-refresh run';
      EXCEPTION
        WHEN undefined_column THEN NULL;
      END;

      BEGIN
        COMMENT ON COLUMN public.research_projects.validation_score IS
          'Computed validation score (0-100) for the latest refresh';
      EXCEPTION
        WHEN undefined_column THEN NULL;
      END;

      BEGIN
        COMMENT ON COLUMN public.research_projects.validation_snapshot IS
          'Stored validation snapshot JSON for the latest refresh';
      EXCEPTION
        WHEN undefined_column THEN NULL;
      END;
    END
    $$;
  `;

  const response = await fetch(postgresQueryUrl, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: ddl }),
  }).catch((error) => {
    summary.errors.push({
      step: "columns-comments",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  });

  if (!response) {
    return;
  }

  if (!response.ok) {
    const errorText = await response.text();
    summary.errors.push({
      step: "columns-comments",
      message: errorText || response.statusText,
      statusCode: response.status,
    });
    return;
  }

  summary.columnsEnsured = true;
  summary.commentsEnsured = true;
}

async function ensurePolicy() {
  console.log("[ensureResearchRefreshSchema] Ensuring policy via SQL exec");
  const sql = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_tables
        WHERE schemaname = 'public'
          AND tablename = 'research_projects'
      ) THEN
        RAISE NOTICE 'Table public.research_projects does not exist.';
      ELSE
        BEGIN
          ALTER TABLE public.research_projects ENABLE ROW LEVEL SECURITY;
        EXCEPTION
          WHEN duplicate_object THEN NULL;
        END;

        IF EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'research_projects'
            AND policyname = 'Allow service role to update refresh time'
        ) THEN
          EXECUTE 'DROP POLICY \"Allow service role to update refresh time\" ON public.research_projects';
        END IF;

        IF NOT EXISTS (
          SELECT 1
          FROM pg_policies
          WHERE schemaname = 'public'
            AND tablename = 'research_projects'
            AND policyname = 'Allow service role updates'
        ) THEN
          CREATE POLICY "Allow service role updates"
            ON public.research_projects
            FOR UPDATE
            TO service_role
            USING (true)
            WITH CHECK (true);
        END IF;
      END IF;
    END
    $$;
  `;

  const response = await fetch(postgresQueryUrl, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify({ query: sql }),
  }).catch((error) => {
    summary.errors.push({
      step: "policy",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  });

  if (!response) {
    return;
  }

  if (!response.ok) {
    const errorText = await response.text();
    summary.errors.push({
      step: "policy",
      message: errorText || response.statusText,
      statusCode: response.status,
    });
    return;
  }

  summary.policyEnsured = true;
}

async function verifyAvailability() {
  try {
    await supabase.from("research_projects").select("id").limit(1);
  } catch (error) {
    summary.errors.push({
      step: "availability-check",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function main() {
  await ensureColumnsAndComments();
  await ensurePolicy();
  await verifyAvailability();
  console.log(JSON.stringify(summary, null, 2));
  if (summary.errors.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  summary.errors.push({
    step: "unexpected",
    message: error instanceof Error ? error.message : String(error),
  });
  console.log(JSON.stringify(summary, null, 2));
  process.exit(1);
});

