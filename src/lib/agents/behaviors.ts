import { randomUUID } from "crypto";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { resolveApiBase } from "@/lib/agents";

export interface AgentBehavior {
  id: string;
  agent_id: string;
  name: string;
  description: string | null;
  action_type: string;
  config: Record<string, unknown> | null;
  enabled: boolean | null;
  last_run: string | null;
  created_at: string;
}

export interface BehaviorRunParameters {
  [key: string]: unknown;
}

export interface BehaviorActionResult {
  summary: string;
  meta?: Record<string, unknown>;
}

function isAgentBehavior(row: unknown): row is AgentBehavior {
  if (!row || typeof row !== "object") return false;
  const value = row as Record<string, unknown>;
  return (
    typeof value.id === "string" &&
    typeof value.agent_id === "string" &&
    typeof value.name === "string" &&
    typeof value.action_type === "string"
  );
}

export async function fetchBehavior(id: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_behaviors")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(`[behaviors] Failed to fetch behavior ${id}: ${error.message}`);
  }

  if (!isAgentBehavior(data)) {
    throw new Error(`[behaviors] Behavior ${id} not found or invalid.`);
  }

  return data;
}

export async function listBehaviorsByTrigger(trigger: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_behaviors")
    .select("*")
    .eq("enabled", true);

  if (error) {
    throw new Error(
      `[behaviors] Failed to fetch behaviors with trigger ${trigger}: ${error.message}`
    );
  }

  return (data ?? [])
    .filter(validateBehaviorRow)
    .filter((behavior) => {
      const config = (behavior.config ?? {}) as Record<string, unknown>;
      const triggerType = config.trigger_type as string | undefined;
      return triggerType === trigger;
    });
}

async function executeBehaviorAction(
  behavior: AgentBehavior,
  parameters: BehaviorRunParameters | undefined
): Promise<BehaviorActionResult> {
  const action = behavior.action_type.toLowerCase();
  const apiBase = resolveApiBase();
  const config = (behavior.config ?? {}) as Record<string, unknown>;

  const postJson = async (url: string, body?: Record<string, unknown>) => {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await response.text();
    if (!response.ok) {
      throw new Error(text || response.statusText);
    }
    return text ? JSON.parse(text) : null;
  };

  if (action === "analyze" || action === "analyze_pain_points") {
    const payload = {
      agent_id: behavior.agent_id,
      ...(parameters ?? {}),
    };
    const json = await postJson(`${apiBase}/api/agents/analyze`, payload);
    const successCount =
      json?.results?.filter((item: { success?: boolean }) => item?.success === true)
        ?.length ?? 0;

    return {
      summary: `Analyze action completed. ${successCount} insight(s) generated.`,
      meta: { successCount, response: json },
    };
  }

  if (action === "relay" || action === "relay_message") {
    const defaults = {
      conversation_id:
        (parameters?.conversation_id as string) ??
        (config.conversation_id as string | undefined) ??
        randomUUID(),
      sender_agent:
        (parameters?.sender_agent as string) ??
        (config.sender_agent as string | undefined) ??
        behavior.agent_id ??
        "agent_orchestrator",
      receiver_agent:
        (parameters?.receiver_agent as string) ??
        (config.receiver_agent as string | undefined) ??
        "agent_researcher",
      content:
        (parameters?.content as string) ??
        (config.content as string | undefined) ??
        "Automated test relay message from behavior runner",
    };

    const relayPayload = {
      ...defaults,
      ...(parameters ?? {}),
    } as Record<string, unknown>;

    const relayJson = await postJson(`${apiBase}/api/agents/relay`, relayPayload);

    return {
      summary: `Relay message sent from ${relayPayload.sender_agent} to ${relayPayload.receiver_agent}.`,
      meta: { response: relayJson, payload: relayPayload },
    };
  }

  if (action === "reflect") {
    const payload = {
      agent_id: behavior.agent_id,
      ...(parameters ?? {}),
    };
    const json = await postJson(`${apiBase}/api/agents/reflect`, payload);
    return {
      summary: "Reflection generated successfully.",
      meta: { response: json },
    };
  }

  throw new Error(`Unsupported behavior action: ${behavior.action}`);
}

export async function runBehavior(
  behavior: AgentBehavior,
  parameters?: BehaviorRunParameters
) {
  const supabase = getSupabaseAdminClient();
  const config = (behavior.config ?? {}) as Record<string, unknown>;
  const mergedParameters = {
    ...((config.parameters as Record<string, unknown>) ?? {}),
    ...(parameters ?? {}),
  } as BehaviorRunParameters;

  try {
    const result = await executeBehaviorAction(behavior, mergedParameters);
    const apiBase = resolveApiBase();
    const syncResults: Array<{
      stage: string;
      status: "ok" | "error";
      detail?: unknown;
    }> = [];

    const completedAt = new Date().toISOString();
    await supabase
      .from("agent_behaviors")
      .update({ last_run: completedAt })
      .eq("id", behavior.id);

    await supabase.from("agent_insights").insert([
      {
        agent_id: behavior.agent_id,
        source_table: "agent_behaviors",
        source_id: behavior.id,
        insight_type: behavior.action_type,
        summary: result.summary,
        confidence: 0.9,
        meta: {
          behavior_id: behavior.id,
          ...(result.meta ?? {}),
        },
      },
    ]);

    // Trigger memory sync
    try {
      const memoryResponse = await fetch(`${apiBase}/api/agents/memory/sync`, {
        method: "POST",
      });
      const memoryText = await memoryResponse.text();
      if (!memoryResponse.ok) {
        throw new Error(memoryText || memoryResponse.statusText);
      }
      const memoryJson = memoryText ? JSON.parse(memoryText) : null;
      syncResults.push({ stage: "memory_sync", status: "ok", detail: memoryJson });
    } catch (error) {
      console.error("[behavior] memory sync failed", error);
      syncResults.push({
        stage: "memory_sync",
        status: "error",
        detail: String(error),
      });
    }

    // Trigger reflection sync
    try {
      const reflectionResponse = await fetch(`${apiBase}/api/agents/reflect`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agent_id: behavior.agent_id ?? "agent_researcher" }),
      });
      const reflectionText = await reflectionResponse.text();
      if (!reflectionResponse.ok) {
        throw new Error(reflectionText || reflectionResponse.statusText);
      }
      const reflectionJson = reflectionText ? JSON.parse(reflectionText) : null;
      syncResults.push({
        stage: "reflection_sync",
        status: "ok",
        detail: reflectionJson,
      });
    } catch (error) {
      console.error("[behavior] reflection sync failed", error);
      syncResults.push({
        stage: "reflection_sync",
        status: "error",
        detail: String(error),
      });
    }

    console.log(
      `[behavior:${behavior.action_type}] Memory+Reflection sync complete`,
      syncResults
    );

    console.log(`[runBehavior] ${behavior.action_type} executed successfully`);

    const allSynced =
      syncResults.length > 0 &&
      syncResults.every((entry) => entry.status === "ok");

    return {
      success: true,
      action: behavior.action_type,
      result,
      sync: syncResults,
      synced: allSynced,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);

    await supabase
      .from("agent_behaviors")
      .update({ last_run: new Date().toISOString() })
      .eq("id", behavior.id);

    await supabase.from("agent_insights").insert([
      {
        agent_id: behavior.agent_id,
        source_table: "agent_behaviors",
        source_id: behavior.id,
        insight_type: `${behavior.action_type}_failed`,
        summary: "Behavior execution failed.",
        confidence: 0.2,
        meta: {
          behavior_id: behavior.id,
          error: message,
        },
      },
    ]);

    throw error;
  }
}

export function validateBehaviorRow(row: unknown): row is AgentBehavior {
  return isAgentBehavior(row);
}
