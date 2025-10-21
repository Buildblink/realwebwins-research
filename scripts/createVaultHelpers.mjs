import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY;

const summary = {
  tagsColumnAdded: false,
  policiesEnsured: false,
  schemaReloaded: false,
  errors: [],
};

if (!supabaseUrl) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL environment variable.");
  process.exit(1);
}

if (!serviceRoleKey) {
  console.error(
    "Missing SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY environment variable."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function ensureTagsColumn() {
  const { error } = await supabase.rpc("exec", {
    sql: `
      alter table public.research_projects
      add column if not exists tags text[] default '{}';
    `,
  });

  if (error) {
    summary.errors.push({
      step: "alter-table",
      message:
        error.message ??
        "Failed to add tags column (Supabase SQL execution not available in this environment). Please run the SQL manually.",
    });
    return;
  }

  summary.tagsColumnAdded = true;
}

async function ensurePolicies() {
  const sql = `
    drop policy if exists "Allow service role inserts" on public."Playbooks";
    drop policy if exists "Allow service role reads" on public."Playbooks";
    create policy "Allow service role inserts"
    on public."Playbooks"
    for insert
    to service_role
    with check (true);
    create policy "Allow service role reads"
    on public."Playbooks"
    for select
    to service_role
    using (true);
    select pg_notify('pgrst', 'reload schema');
  `;

  const { error } = await supabase.rpc("exec", { sql });

  if (error) {
    summary.errors.push({
      step: "policies",
      message:
        error.message ??
        "Failed to configure policies (Supabase SQL execution not available in this environment). Please run the SQL manually.",
    });
    return;
  }

  summary.policiesEnsured = true;
  summary.schemaReloaded = true;
}

async function main() {
  await ensureTagsColumn();
  await ensurePolicies();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  summary.errors.push({
    step: "unexpected",
    message: error instanceof Error ? error.message : String(error),
  });
  console.log(JSON.stringify(summary, null, 2));
  process.exit(1);
});
