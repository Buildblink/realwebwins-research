#!/usr/bin/env node
import "dotenv/config";
import chalk from "chalk";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    chalk.red(
      "[seed:architect] Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables."
    )
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
});

const agentName = "agent_architect";
const prompt = [
  "You are the Architect agent for Realwebwins.",
  "Given the pain point: {{pain_point}}, design a lean, scalable architecture for the MVP.",
  "Output markdown with sections:",
  "1. Core Components (bullet list)",
  "2. Data Model (tables with key fields)",
  "3. Integrations (service + purpose)",
  "4. Deployment Plan (steps).",
  "Keep each section concise and focused on founder execution.",
].join("\n");

async function main() {
  console.log(chalk.cyan("[seed:architect] Ensuring architect agent definition exists..."));

  const { data: existing, error: selectError } = await supabase
    .from("agent_definitions")
    .select("id")
    .eq("name", agentName)
    .maybeSingle();

  if (selectError) {
    throw new Error(`Failed to check existing agent: ${selectError.message}`);
  }

  if (existing?.id) {
    const { error: updateError } = await supabase
      .from("agent_definitions")
      .update({
        role: "architect",
        prompt,
        mode: "relay",
        llm_provider: "anthropic",
        llm_model: "claude-3-5-sonnet-20241022",
        temperature: 0.3,
        enabled: true,
        version: 2,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existing.id);

    if (updateError) {
      throw new Error(`Failed to update architect agent: ${updateError.message}`);
    }

    console.log(chalk.green("[seed:architect] Architect agent updated."));
    return;
  }

  const { error: insertError } = await supabase.from("agent_definitions").insert([
    {
      name: agentName,
      role: "architect",
      prompt,
      mode: "relay",
      llm_provider: "anthropic",
      llm_model: "claude-3-5-sonnet-20241022",
      temperature: 0.3,
      enabled: true,
      version: 1,
    },
  ]);

  if (insertError) {
    throw new Error(`Failed to insert architect agent: ${insertError.message}`);
  }

  console.log(chalk.green("[seed:architect] Architect agent inserted."));
}

main().catch((error) => {
  console.error(chalk.red(`[seed:architect] ${error.message}`));
  process.exit(1);
});
