const fs = require('fs');
const path = require('path');
const envFile = path.resolve(__dirname, '..', '.env.local');
if (fs.existsSync(envFile)) {
  const lines = fs.readFileSync(envFile, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const idx = trimmed.indexOf('=');
    if (idx === -1) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = trimmed.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = value;
  }
}
const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
(async () => {
  if (!baseUrl || !key) {
    console.error('missing');
    return;
  }
  const url = baseUrl.replace(/\/$/, '') + '/rest/v1/pg_meta/tables';
  const res = await fetch(url, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Accept: 'application/json',
      'Accept-Profile': 'pg_meta',
    },
  });
  console.log(res.status);
  console.log(await res.text());
})();
