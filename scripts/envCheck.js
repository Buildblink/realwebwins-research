const fs = require('fs');
const path = require('path');
const envPath = path.resolve('.env.local');
const requiredKeys = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'PLAUSIBLE_DOMAIN',
  'AI_PROVIDER',
  'ADMIN_MODE'
];
const contents = fs.readFileSync(envPath, 'utf8');
const pairs = {};
for (const line of contents.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const idx = trimmed.indexOf('=');
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const value = trimmed.slice(idx + 1).trim();
  pairs[key] = value;
}
let missing = false;
for (const key of requiredKeys) {
  const value = pairs[key];
  if (!value) {
    console.log(`ENV ${key}: MISSING`);
    missing = true;
  } else {
    console.log(`ENV ${key}: ${value.slice(0, 10)}`);
  }
}
if (missing) {
  console.log('? Missing ENV');
  process.exitCode = 1;
}
