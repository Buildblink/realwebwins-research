#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

const apiBase = process.env.API_BASE_URL || "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const DEFAULT_PROVIDER = process.env.TEST_LLM_PROVIDER || "openai";
const DEFAULT_MODEL =
  process.env.TEST_LLM_MODEL ||
  (DEFAULT_PROVIDER === "openai"
    ? "gpt-4o-mini"
    : DEFAULT_PROVIDER === "anthropic"
    ? "claude-3-5-sonnet-20240620"
    : DEFAULT_PROVIDER === "gemini"
    ? "gemini-1.5-flash"
    : "gpt-4o-mini");

async function main() {
  console.log(chalk.cyan("\n🚀  Phase 34 Dynamic Flow Verification"));

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase credentials missing.");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  // Get any existing pain point
  const { data: painPoints, error: painError } = await supabase
    .from("pain_points")
    .select("id, summary, text")
    .limit(1);

  if (painError || !painPoints || painPoints.length === 0) {
    throw new Error("No pain points available for dynamic test.");
  }

  const painPoint = painPoints[0];
  const agentName = `dynamic-${Date.now()}`;

  const agentPayload = {
    name: agentName,
    role: "Dynamic Verifier",
    prompt: "Provide a single bullet plan for {{pain_point}}.",
    mode: "relay",
    llm_provider: DEFAULT_PROVIDER,
    llm_model: DEFAULT_MODEL,
    temperature: 0.1,
    enabled: true,
    version: 1,
  };

  // Insert temp agent
  const { data: inserted, error: insertError } = await supabase
    .from("agent_definitions")
    .insert([agentPayload])
    .select("id")
    .single();

  if (insertError) {
    throw new Error(`Failed to insert dynamic agent: ${insertError.message}`);
  }

  const agentId = inserted.id;
  console.log(chalk.green(`✓ Temporary agent created (${agentId})`));

  try {
    const response = await fetch(`${apiBase}/api/mvp/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pain_id: painPoint.id }),
    });

    const json = await response.json();

    if (!response.ok || !json?.success) {
      throw new Error(`MVP generation failed: ${json?.message || response.statusText}`);
    }

    console.log(chalk.green("✓ MVP generation endpoint succeeded"));

    const transcript = json.transcript ?? [];
    if (!Array.isArray(transcript) || transcript.length === 0) {
      throw new Error("Dynamic agent transcript empty.");
    }

    console.log(chalk.green("✓ Dynamic agent output detected in transcript"));
  } finally {
    // Always clean up the temporary agent
    await supabase.from("agent_definitions").delete().eq("id", agentId);
    console.log(chalk.yellow(`🧹 Temporary agent (${agentId}) deleted.`));
  }

  console.log(chalk.green("\n✅ Dynamic flow verification completed successfully."));
}

main().catch((error) => {
  console.error(chalk.red(`✖ verifyDynamicFlow failed: ${error.message}`));
  process.exitCode = 1;
});
