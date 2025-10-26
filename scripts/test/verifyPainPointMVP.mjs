#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import { randomUUID } from "crypto";
import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";

const apiBase = process.env.API_BASE_URL || "http://localhost:3002";
const normalizedApiBase = apiBase.replace(/\/$/, "");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error(chalk.red("✖ Supabase configuration missing for verification."));
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false },
});

async function ensurePainPointTable() {
  const response = await fetch(
    `${supabaseUrl.replace(/\/$/, "")}/rest/v1/pain_points?select=id&limit=1`,
    {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
    }
  );

  if (!response.ok) {
    console.error(
      chalk.red(
        `✖ pain_points table check failed (${response.status}). Run npm run ensure:phase33-schema`
      )
    );
    return false;
  }

  console.log(chalk.green("✓ pain_points table reachable via REST"));
  return true;
}

async function seedPainPoint() {
  const id = randomUUID();
  const { error } = await supabase.from("pain_points").insert([
    {
      id,
      text: "Etsy sellers struggle to update shipping rates across multiple regions.",
      category: "E-commerce",
      source: "Community",
    },
  ]);

  if (error) {
    throw new Error(`Failed to seed pain point: ${error.message}`);
  }

  console.log(chalk.green("✓ Seeded sample pain point"));
  return id;
}

async function generateMVP(painId) {
  const response = await fetch(`${normalizedApiBase}/api/mvp/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ pain_id: painId }),
  });

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(
      `Generation failed (${response.status}): ${json.message ?? "Unknown error"}`
    );
  }

  console.log(
    chalk.green(
      `✓ MVP generated (session ${json.session_id}, mvp ${json.mvp_id})`
    )
  );

  return {
    session_id: json.session_id,
    mvp_id: json.mvp_id,
  };
}

async function pollSession(sessionId) {
  const response = await fetch(`${normalizedApiBase}/api/agents/session/${sessionId}`);

  const json = await response.json();
  if (!response.ok || !json.success) {
    throw new Error(
      `Session fetch failed (${response.status}): ${json.message ?? "Unknown"}`
    );
  }

  console.log(
    chalk.green(
      `✓ Transcript saved (${json.session?.transcript?.length ?? 0} messages)`
    )
  );

  return json;
}

async function downloadExport(mvpId) {
  const response = await fetch(`${normalizedApiBase}/api/export/mvp/${mvpId}`);
  if (!response.ok) {
    throw new Error(
      `Export failed (${response.status}): ${await response.text()}`
    );
  }
  const size = Number(response.headers.get("content-length") ?? response.headers.get("Content-Length") ?? "0");
  console.log(
    chalk.green(
      `✓ MVP pack exported successfully (${size} bytes)`
    )
  );
}

async function cleanup(painId) {
  try {
    await supabase.from("pain_points").delete().eq("id", painId);
  } catch (error) {
    console.warn("[cleanup] Unable to delete pain point", error);
  }
}

async function main() {
  console.log(chalk.cyan("\n🚀 Phase 33 Pain → MVP Verification"));

  const checks = [];
  checks.push(await ensurePainPointTable());

  let painId = null;
  try {
    painId = await seedPainPoint();
    console.log("🔗 Using API base:", apiBase);
    const { session_id, mvp_id } = await generateMVP(painId);
    await pollSession(session_id);
    await downloadExport(mvp_id);
    checks.push(true);
  } catch (error) {
    console.error(
      chalk.red(
        `✖ Verification failed: ${error instanceof Error ? error.message : String(error)}`
      )
    );
    checks.push(false);
  } finally {
    if (painId) await cleanup(painId);
  }

  if (checks.every(Boolean)) {
    console.log(chalk.green("\n✅ Verification completed"));
  } else {
    console.warn(chalk.yellow("\n⚠️ Verification encountered issues"));
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(chalk.red(`✖ verifyPainPointMVP crashed: ${error.message}`));
  process.exitCode = 1;
});
