const fs = require('fs');
const path = require('path');
const envFile = path.resolve(__dirname, '..', '.env.local');
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  if (fs.existsSync(envFile)) {
    const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (!process.env[key]) {
        process.env[key] = value;
      }
    }
  }
}

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!baseUrl || !serviceKey) {
  console.error('Missing Supabase env vars');
  process.exit(1);
}
const restEndpoint = baseUrl.replace(/\/$/, '') + '/rest/v1';

async function restGet(pathAndQuery, profile) {
  const url = restEndpoint + pathAndQuery;
  const headers = {
    apikey: serviceKey,
    Authorization: `Bearer ${serviceKey}`,
    Accept: 'application/json',
  };
  if (profile) {
    headers['Accept-Profile'] = profile;
  }
  const res = await fetch(url, { headers });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Request failed (${res.status}) for ${url}: ${text}`);
  }
  return res.json();
}

(async () => {
  try {
    console.log('1) Using Supabase REST endpoint:', restEndpoint);

    const columns = await restGet(
      "/columns?table_name=eq.research_projects&select=column_name,data_type,column_default",
      'information_schema'
    );
    console.log('2) Columns:', columns);
    const hasIsPublic = columns.some(
      (row) => row.column_name === 'is_public' && row.data_type === 'boolean'
    );
    const hasTags = columns.some(
      (row) => row.column_name === 'tags' && row.data_type === 'ARRAY'
    );

    const rlsRows = await restGet(
      "/pg_class?relname=eq.research_projects&select=relrowsecurity,relforcerowsecurity",
      'pg_catalog'
    );
    console.log('3) RLS status:', rlsRows);
    const rlsEnabled = Boolean(rlsRows[0]?.relrowsecurity);

    const policyRows = await restGet(
      "/pg_policies?tablename=eq.research_projects&select=policyname,permissive,roles,cmd,qual",
      'pg_catalog'
    );
    console.log('4) Policies:', policyRows);
    const policyPresent = policyRows.some(
      (row) => row.policyname === 'Allow public read of public vault'
    );

    const summary = {
      columns: { is_public: hasIsPublic, tags: hasTags },
      rls_enabled: rlsEnabled,
      policy_present: policyPresent,
    };
    console.log('5) Summary:', JSON.stringify(summary));

    const repairs = [];
    if (!hasIsPublic) {
      repairs.push(
        "ALTER TABLE public.research_projects ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;"
      );
    }
    if (!hasTags) {
      repairs.push(
        "ALTER TABLE public.research_projects ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[];"
      );
    }
    if (!rlsEnabled) {
      repairs.push(
        "ALTER TABLE public.research_projects ENABLE ROW LEVEL SECURITY;"
      );
    }
    if (!policyPresent) {
      repairs.push(
        "CREATE POLICY \"Allow public read of public vault\" ON public.research_projects FOR SELECT USING (is_public = true);"
      );
    }

    if (repairs.length > 0) {
      console.log('Repair SQL needed:\n' + repairs.join('\n'));
    } else {
      console.log('No repairs needed.');
    }
  } catch (error) {
    console.error('Check failed:', error);
    process.exit(1);
  }
})();
