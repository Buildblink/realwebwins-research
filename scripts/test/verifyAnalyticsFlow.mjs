#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import { createClient } from "@supabase/supabase-js";

const apiBase = process.env.API_BASE_URL || "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  console.log(chalk.cyan("\n📊  Phase 35 Analytics Flow Verification"));

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase service role credentials are required for verification.");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const painPoints = await supabase.from("pain_points").select("id").limit(1);
  if (painPoints.error || !painPoints.data || painPoints.data.length === 0) {
    throw new Error("No pain points found; seed data before running analytics verification.");
  }
  const painId = painPoints.data[0].id;

  const baselineMetrics = await supabase
    .from("agent_run_metrics")
    .select("id", { count: "exact", head: true });
  if (baselineMetrics.error) {
    throw new Error(`Unable to read baseline metrics: ${baselineMetrics.error.message}`);
  }
  const baselineCount = baselineMetrics.count ?? 0;

  console.log(chalk.gray(`ℹ️  Baseline metrics count: ${baselineCount}`));

  for (let index = 0; index < 2; index += 1) {
    const response = await fetch(`${apiBase}/api/mvp/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pain_id: painId }),
    });
    const json = await response.json();
    if (!response.ok || !json?.success) {
      throw new Error(`MVP generation failed: ${json?.message ?? "unknown error"}`);
    }
    console.log(chalk.green(`✅  MVP generation ${index + 1} succeeded (session ${json.session_id}).`));
  }

  const updatedMetrics = await supabase
    .from("agent_run_metrics")
    .select("id", { count: "exact", head: true });
  if (updatedMetrics.error) {
    throw new Error(`Unable to read updated metrics count: ${updatedMetrics.error.message}`);
  }
  const updatedCount = updatedMetrics.count ?? 0;
  if (updatedCount <= baselineCount) {
    throw new Error("Agent run metrics count did not increase after MVP generation.");
  }

  const finalMetricsSample = await supabase
    .from("agent_run_metrics")
    .select("id, llm_provider, llm_model, duration_ms, tokens, created_at")
    .order("created_at", { ascending: false })
    .limit(5);
  if (finalMetricsSample.error) {
    throw new Error(`Unable to read updated metrics: ${finalMetricsSample.error.message}`);
  }

  console.log(
    chalk.green(
      `✅  Metrics rows increased from ${baselineCount} to ${updatedCount}. Latest provider: ${
        finalMetricsSample.data?.[0]?.llm_provider ?? "unknown"
      }.`
    )
  );

  console.log(chalk.green("\n✅  Analytics flow verification completed successfully."));
}

main().catch((error) => {
  console.error(chalk.red(`✖  verifyAnalyticsFlow failed: ${error instanceof Error ? error.message : error}`));
  process.exitCode = 1;
});
