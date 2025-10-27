#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import { randomUUID } from "crypto";
import { createClient } from "@supabase/supabase-js";

const apiBase = process.env.API_BASE_URL || "http://localhost:3000";
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function main() {
  console.log(chalk.cyan("\n??  Phase 34 Admin Agents Verification"));

  if (process.env.ADMIN_MODE !== "true") {
    console.log(chalk.yellow("??  ADMIN_MODE is not enabled. Skipping admin verification."));
    return;
  }

  if (!supabaseUrl || !serviceKey) {
    throw new Error("Supabase service role credentials are required for verification.");
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false },
  });

  const TEST_PROVIDER = process.env.TEST_LLM_PROVIDER || "openai";
  const TEST_MODEL =
    process.env.TEST_LLM_MODEL ||
    (TEST_PROVIDER === "openai"
      ? "gpt-4o-mini"
      : TEST_PROVIDER === "anthropic"
      ? "claude-3-5-sonnet-20240620"
      : TEST_PROVIDER === "gemini"
      ? "gemini-1.5-flash"
      : "gpt-4o-mini");

  const newAgent = {
    name: `verify_agent_${Date.now()}`,
    role: "verification",
    prompt: "You are a test agent; reply with a 1-line summary.",
    mode: "relay",
    llm_provider: TEST_PROVIDER,
    llm_model: TEST_MODEL,
    temperature: 0.2,
    enabled: true,
  };

  // 1. Create agent
  const createResponse = await fetch(`${apiBase}/api/admin/agents`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(newAgent),
  });
  const created = await createResponse.json();
  if (!createResponse.ok || !created?.success) {
    throw new Error(`Agent creation failed: ${created?.message ?? created?.error ?? "unknown"}`);
  }
  const agentId = created.data.id;
  console.log(chalk.green(`? Created agent ${agentId}`));

  // 2. List agents
  const listResponse = await fetch(`${apiBase}/api/admin/agents`);
  const listed = await listResponse.json();
  if (!listResponse.ok || !listed?.success) {
    throw new Error(`Agent list failed: ${listed?.message ?? listed?.error ?? "unknown"}`);
  }
  const found = (listed.data ?? []).some((agent) => agent.id === agentId);
  if (!found) {
    throw new Error("Created agent not found in list response.");
  }
  console.log(chalk.green("? Agent appears in list"));

  // 3. Test prompt (local provider)
  const testResponse = await fetch(`${apiBase}/api/admin/prompts/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      provider: TEST_PROVIDER,
      model: TEST_MODEL,
      prompt: "Say hello from admin verifier.",
    }),
  });
  const testJson = await testResponse.json();
  if (!testResponse.ok || !testJson?.success) {
    throw new Error(`Prompt test failed: ${testJson?.message ?? testJson?.error ?? "unknown"}`);
  }
  console.log(chalk.green(`? Prompt test succeeded (${TEST_PROVIDER})`));

  // 4. Confirm run history logged
  const { data: runRows, error: runError } = await supabase
    .from("agent_runs")
    .select("id")
    .order("created_at", { ascending: false })
    .limit(1);
  if (runError) {
    throw new Error(`Failed to fetch agent_runs: ${runError.message}`);
  }
  if (!runRows || runRows.length === 0) {
    throw new Error("No agent_runs entry recorded after prompt test.");
  }
  console.log(chalk.green("? agent_runs entry exists"));

  // cleanup
  await fetch(`${apiBase}/api/admin/agents?id=${agentId}`, { method: "DELETE" });

  console.log(chalk.green("\n? Admin agents verification completed successfully."));
}

main().catch((error) => {
  console.error(chalk.red(`? verifyAdminAgents failed: ${error instanceof Error ? error.message : error}`));
  process.exitCode = 1;
});
