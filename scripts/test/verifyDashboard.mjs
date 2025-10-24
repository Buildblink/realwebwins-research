#!/usr/bin/env node
import "dotenv/config";
const API_BASE = process.env.API_BASE || "http://localhost:3000";

async function main() {
  console.log("🧪 GET /api/analytics/dashboard");
  const res = await fetch(`${API_BASE}/api/analytics/dashboard?weeks=8`);
  const json = await res.json();
  console.log("Status:", res.status);
  console.log("Body:", JSON.stringify(json, null, 2));
  if (!res.ok || !json?.success) process.exit(1);
  // quick shape check
  const s = json.data?.series;
  if (!s?.remix || !s?.referral || !s?.affiliate || !s?.credits) process.exit(2);
  console.log("✅ Dashboard endpoint OK");
}
main().catch((e)=>{ console.error(e); process.exit(1); });
