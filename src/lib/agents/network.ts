import { performance } from "node:perf_hooks";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { runLLM } from "@/lib/llm/runLLM";

interface AgentLinkRow {
  id: string;
  source_agent: string;
  target_agent: string;
  collaboration_type: string | null;
  strength: number | null;
  context: Record<string, unknown> | null;
  created_at: string;
}

export interface AgentNetworkNode {
  id: string;
}

export interface AgentNetworkLink {
  id: string;
  source_agent: string;
  target_agent: string;
  collaboration_type: string | null;
  strength: number | null;
  context: Record<string, unknown> | null;
  created_at: string;
}

export interface AgentNetworkGraph {
  nodes: AgentNetworkNode[];
  links: AgentNetworkLink[];
}

export interface AgentDefinitionRecord {
  id: string;
  name: string;
  role: string | null;
  prompt: string;
  mode: string;
  llm_provider: string;
  llm_model: string;
  temperature: number | null;
  enabled: boolean | null;
  version: number | null;
  updated_at: string;
}

export interface AgentDynamicResult {
  agent: AgentDefinitionRecord;
  output: string;
  success: boolean;
  durationMs: number;
  tokens?: number | null;
  error?: string;
}

export async function getAgentNetwork(): Promise<AgentNetworkGraph> {
  const supabase = getSupabaseAdminClient();

  const { data: links, error } = await supabase
    .from("agent_links")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`[agents.network] Failed to load agent links: ${error.message}`);
  }

  const normalized = (links ?? []) as AgentLinkRow[];
  const nodeIds = new Set<string>();
  normalized.forEach((link) => {
    if (link.source_agent) {
      nodeIds.add(link.source_agent);
    }
    if (link.target_agent) {
      nodeIds.add(link.target_agent);
    }
  });

  return {
    nodes: Array.from(nodeIds).map((id) => ({ id })),
    links: normalized.map((link) => ({
      id: link.id,
      source_agent: link.source_agent,
      target_agent: link.target_agent,
      collaboration_type: link.collaboration_type,
      strength: link.strength,
      context: link.context,
      created_at: link.created_at,
    })),
  };
}

export async function getActiveAgents(): Promise<AgentDefinitionRecord[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_definitions")
    .select("*")
    .eq("enabled", true)
    .order("version", { ascending: false });

  if (error) {
    throw new Error(`[agents.network] Failed to load agent definitions: ${error.message}`);
  }

  return (data ?? []) as AgentDefinitionRecord[];
}

async function logAgentRun({
  agentId,
  input,
  output,
  provider,
  model,
  durationMs,
}: {
  agentId: string;
  input: Record<string, unknown>;
  output: Record<string, unknown>;
  provider: string;
  model: string;
  durationMs: number;
}) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("agent_runs").insert([
    {
      agent_id: agentId,
      input,
      output,
      llm_provider: provider,
      llm_model: model,
      duration_ms: durationMs,
    },
  ]);

  if (error) {
    console.warn("[agents.network] Failed to log agent run", error);
  }
}

async function logAgentMetrics({
  agentId,
  provider,
  model,
  durationMs,
  tokens,
  success,
}: {
  agentId: string;
  provider: string;
  model: string;
  durationMs: number;
  tokens?: number | null;
  success: boolean;
}) {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("agent_run_metrics").insert([
    {
      agent_id: agentId,
      llm_provider: provider,
      llm_model: model,
      duration_ms: durationMs,
      tokens: tokens ?? 0,
      success,
    },
  ]);

  if (error) {
    console.warn("[agents.network] Failed to log agent metrics", error);
  }
}

interface RunAgentsOptions {
  variables?: Record<string, string>;
  onProgress?: (result: AgentDynamicResult) => void | Promise<void>;
}

export async function runAgentsDynamic(
  painPoint: string,
  options: RunAgentsOptions = {}
): Promise<AgentDynamicResult[]> {
  const agents = await getActiveAgents();
  const results: AgentDynamicResult[] = [];
  const variables = { pain_point: painPoint, ...(options.variables ?? {}) };

  for (const agent of agents) {
    try {
      const started = performance.now();
      const result = await runLLM({
        agent,
        variables,
      });
      const durationMs = Math.round(performance.now() - started);
      const entry: AgentDynamicResult = {
        agent,
        output: result.content,
        success: true,
        durationMs,
        tokens: result.tokens ?? null,
      };
      results.push(entry);

      await logAgentRun({
        agentId: agent.id,
        input: { pain_point: painPoint },
        output: { content: result.content },
        provider: result.provider,
        model: result.model,
        durationMs,
      });
      await logAgentMetrics({
        agentId: agent.id,
        provider: result.provider,
        model: result.model,
        durationMs,
        tokens: result.tokens,
        success: true,
      });

      if (process.env.NODE_ENV !== "production") {
        console.log(
          `🛰️ ${agent.name ?? agent.id} (${result.provider}/${result.model}): ${result.content.slice(0, 80)}...`
        );
      }

      if (options.onProgress) {
        await options.onProgress(entry);
      }
    } catch (error) {
      console.error(
        "[agents.network] Failed to run agent",
        agent.name,
        error instanceof Error ? error.message : error
      );
      await logAgentRun({
        agentId: agent.id,
        input: { pain_point: painPoint },
        output: {
          error: error instanceof Error ? error.message : String(error),
        },
        provider: agent.llm_provider ?? "unknown",
        model: agent.llm_model ?? "unknown",
        durationMs: 0,
      });
      await logAgentMetrics({
        agentId: agent.id,
        provider: agent.llm_provider ?? "unknown",
        model: agent.llm_model ?? "unknown",
        durationMs: 0,
        tokens: 0,
        success: false,
      });

      const entry: AgentDynamicResult = {
        agent,
        output: "",
        success: false,
        durationMs: 0,
        error: error instanceof Error ? error.message : String(error),
        tokens: null,
      };
      results.push(entry);
      if (options.onProgress) {
        await options.onProgress(entry);
      }
    }
  }

  return results;
}
