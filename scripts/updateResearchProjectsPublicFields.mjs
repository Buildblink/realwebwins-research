import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const summary = {
  columnsEnsured: false,
  policyEnsured: false,
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

async function ensureColumnsAndPolicy() {
  const ddl = `
    DO $$
    BEGIN
      BEGIN
        ALTER TABLE public.research_projects
          ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;
      EXCEPTION
        WHEN duplicate_column THEN
          NULL;
      END;

      BEGIN
        ALTER TABLE public.research_projects
          ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[];
      EXCEPTION
        WHEN duplicate_column THEN
          NULL;
      END;
    END
    $$;

    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = 'research_projects'
          AND policyname = 'Allow public read of public vault'
      ) THEN
        CREATE POLICY "Allow public read of public vault"
          ON public.research_projects
          FOR SELECT
          USING (is_public = true);
      END IF;
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
  }).catch((error) => {
    summary.errors.push({
      step: "ddl-request",
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
      step: "ddl-request",
      message: errorText || response.statusText,
      statusCode: response.status,
    });
    return;
  }

  summary.columnsEnsured = true;
  summary.policyEnsured = true;

  try {
    await supabase.from("research_projects").select("id").limit(1);
  } catch (error) {
    summary.errors.push({
      step: "availability-check",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

await ensureColumnsAndPolicy();
console.log(JSON.stringify(summary, null, 2));

if (summary.errors.length > 0) {
  process.exitCode = 1;
}
