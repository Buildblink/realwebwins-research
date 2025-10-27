#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import { createClient } from "@supabase/supabase-js";

const apiBase = process.env.API_BASE_URL || "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  console.log(chalk.cyan("\n🔧  Phase 35 Admin Settings Verification"));

  if (process.env.ADMIN_MODE !== "true") {
    console.log(chalk.yellow("⚠️  ADMIN_MODE disabled. Skipping admin settings verification."));
    return;
  }

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase service role credentials are required for verification.");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const settingsResponse = await fetch(`${apiBase}/api/admin/settings?key=llm_provider`);
  const settingsJson = await settingsResponse.json();
  if (!settingsResponse.ok || !settingsJson?.success) {
    throw new Error(`Failed to load current settings: ${settingsJson?.message ?? "unknown error"}`);
  }

  const previousValue = settingsJson.data?.value ?? null;
  console.log(chalk.green("✅  Loaded current LLM provider settings."));

  const tempSetting = {
    provider: previousValue?.provider ?? "openai",
    model: previousValue?.model ?? "gpt-4o-mini",
    temperature: previousValue?.temperature ? Math.max(0, Math.min(1, Number(previousValue.temperature))) : 0.65,
  };

  const saveResponse = await fetch(`${apiBase}/api/admin/settings`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ key: "llm_provider", value: tempSetting }),
  });
  const saveJson = await saveResponse.json();
  if (!saveResponse.ok || !saveJson?.success) {
    throw new Error(`Failed to update settings: ${saveJson?.message ?? "unknown error"}`);
  }
  console.log(chalk.green("✅  Updated provider settings via API."));

  const testResponse = await fetch(`${apiBase}/api/admin/test-llm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prompt: "Say hello from the admin settings verifier in one short sentence.",
      provider: tempSetting.provider,
      model: tempSetting.model,
      temperature: tempSetting.temperature,
    }),
  });
  const testJson = await testResponse.json();
  if (!testResponse.ok || !testJson?.success) {
    throw new Error(`LLM test endpoint failed: ${testJson?.message ?? "unknown error"}`);
  }
  console.log(
    chalk.green(
      `✅  Test LLM endpoint responded (${testJson.data.provider} · ${testJson.data.model}, ${testJson.data.durationMs}ms)`
    )
  );

  const metricsCheck = await supabase
    .from("agent_run_metrics")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1);
  if (metricsCheck.error) {
    throw new Error(`Failed to read agent_run_metrics: ${metricsCheck.error.message}`);
  }
  console.log(chalk.green("✅  Metrics table reachable after test run."));

  if (previousValue) {
    await fetch(`${apiBase}/api/admin/settings`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ key: "llm_provider", value: previousValue }),
    });
    console.log(chalk.gray("↺  Restored previous provider settings."));
  }

  console.log(chalk.green("\n✅  Admin settings verification completed successfully."));
}

main().catch((error) => {
  console.error(chalk.red(`✖  verifyAdminSettings failed: ${error instanceof Error ? error.message : error}`));
  process.exitCode = 1;
});
