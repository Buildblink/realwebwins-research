import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const result = {
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
  const { error } = await supabase.from("AgentStatus").select("id").limit(1);
  if (!error) {
    return true;
  }

  if (error.code && error.code !== "PGRST205") {
    result.errors.push({
      step: "preflight-check",
      message: error.message ?? "Unknown error from Supabase.",
      statusCode: error.code,
    });
  }

  return false;
}

async function ensureTable() {
  if (await tableExists()) {
    result.alreadyExists = true;
    result.available = true;
    await ensureColumns();
    return;
  }

  const ddl = `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = 'AgentStatus'
      ) THEN
        CREATE TABLE public."AgentStatus" (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          idea text NOT NULL,
          stage text NOT NULL,
          success boolean NOT NULL DEFAULT false,
          error_log text,
          last_run timestamptz NOT NULL DEFAULT now(),
          run_type text DEFAULT 'cron',
          passed boolean DEFAULT false,
          summary text
        );
        ALTER TABLE public."AgentStatus" ENABLE ROW LEVEL SECURITY;
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
    result.errors.push({
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
    result.errors.push({
      step: "ddl-request",
      message: errorText || response.statusText,
      statusCode: response.status,
    });
    return;
  }

  result.created = true;
  await ensureColumns();

  const maxAttempts = 5;
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    result.attempts = attempt + 1;
    if (await tableExists()) {
      result.available = true;
      return;
    }

    await new Promise((resolve) =>
      setTimeout(resolve, Math.min(500 * Math.pow(2, attempt), 4000))
    );
  }

  result.errors.push({
    step: "availability-check",
    message: "Timed out waiting for AgentStatus to become queryable via PostgREST.",
  });
}

async function ensureColumns() {
  const columnDDL = `
    DO $$
    BEGIN
      BEGIN
        ALTER TABLE public."AgentStatus"
          ADD COLUMN IF NOT EXISTS run_type text DEFAULT 'cron';
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;

      BEGIN
        ALTER TABLE public."AgentStatus"
          ADD COLUMN IF NOT EXISTS passed boolean DEFAULT false;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;

      BEGIN
        ALTER TABLE public."AgentStatus"
          ADD COLUMN IF NOT EXISTS summary text;
      EXCEPTION
        WHEN duplicate_column THEN NULL;
      END;
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
    body: JSON.stringify({ query: columnDDL }),
  }).catch((error) => {
    result.errors.push({
      step: "column-ensure",
      message: error instanceof Error ? error.message : String(error),
    });
    return null;
  });

  if (response && !response.ok) {
    const text = await response.text();
    result.errors.push({
      step: "column-ensure",
      message: text || response.statusText,
      statusCode: response.status,
    });
  }
}

await ensureTable();
console.log(JSON.stringify(result, null, 2));

if (!result.available) {
  process.exitCode = 1;
}
