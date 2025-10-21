import "dotenv/config";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY ??
  "";

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "[listPolicies] Missing NEXT_PUBLIC_SUPABASE_URL or service role key."
  );
  process.exit(1);
}

const endpoint = supabaseUrl.endsWith("/")
  ? `${supabaseUrl}postgres/v1/query`
  : `${supabaseUrl}/postgres/v1/query`;
const endpointWithKey = `${endpoint}?apikey=${encodeURIComponent(
  serviceRoleKey
)}`;

const sql = `
  select schemaname,
         tablename,
         policyname,
         roles,
         cmd,
         qual,
         with_check
  from pg_policies
  where schemaname = 'public'
    and tablename in ('research_projects', 'AgentStatus')
  order by tablename, policyname;
`;

console.log("[listPolicies] Querying SQL API endpoint");

const response = await fetch(endpointWithKey, {
  method: "POST",
  headers: {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
    "Content-Type": "application/json",
    Accept: "application/json",
  },
  body: JSON.stringify({ query: sql }),
});

const text = await response.text();
console.log(text);

if (!response.ok) {
  process.exit(1);
}
