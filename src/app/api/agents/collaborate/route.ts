import { NextResponse } from "next/server";
import {
  runBehavior,
  validateBehaviorRow,
  type AgentBehavior,
} from "@/lib/agents/behaviors";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

type CollaborationType = "relay" | "assist" | "analyze";

interface CollaborationPayload {
  source_agent?: string;
  max_links?: number;
}

interface AgentLinkRow {
  id: string;
  source_agent: string;
  target_agent: string;
  collaboration_type: CollaborationType | null;
  strength: number | null;
  context: Record<string, unknown> | null;
}

const behaviorCache = new Map<string, AgentBehavior>();

async function loadBehavior(agentId: string, actionType: string) {
  const cacheKey = `${agentId}:${actionType}`;
  if (behaviorCache.has(cacheKey)) {
    return behaviorCache.get(cacheKey) ?? null;
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_behaviors")
    .select("*")
    .eq("agent_id", agentId)
    .eq("action_type", actionType)
    .eq("enabled", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(
      `[agents.collaborate] Failed to load behavior for ${agentId}/${actionType}: ${error.message}`
    );
  }

  if (!validateBehaviorRow(data)) {
    return null;
  }

  behaviorCache.set(cacheKey, data);
  return data;
}

function normalizeCollaborationType(value: unknown): CollaborationType {
  if (typeof value !== "string") return "relay";
  const lower = value.toLowerCase();
  if (lower === "analyze" || lower === "assist" || lower === "relay") {
    return lower;
  }
  return "relay";
}

function mapCollaborationToAction(collaboration: CollaborationType): string {
  if (collaboration === "assist") {
    return "relay";
  }
  return collaboration;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as CollaborationPayload;
  const sourceAgent = payload.source_agent?.trim();

  if (!sourceAgent) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_SOURCE_AGENT",
        message: "source_agent is required.",
      },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_links")
    .select("*")
    .eq("source_agent", sourceAgent)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[agents.collaborate] Failed to query links", error);
    return NextResponse.json(
      {
        success: false,
        error: "LINK_QUERY_FAILED",
        message: error.message,
      },
      { status: 500 }
    );
  }

  const links = (data ?? []) as AgentLinkRow[];
  const limit =
    typeof payload.max_links === "number" && Number.isFinite(payload.max_links)
      ? Math.max(1, Math.min(payload.max_links, links.length))
      : links.length;

  const results: Array<{
    link_id: string;
    target_agent: string;
    collaboration_type: CollaborationType;
    action_type: string;
    success: boolean;
    outcome?: unknown;
    error?: string;
  }> = [];

  for (const link of links.slice(0, limit)) {
    const collaboration = normalizeCollaborationType(link.collaboration_type);
    const actionType = mapCollaborationToAction(collaboration);
    try {
      const behavior = await loadBehavior(link.target_agent, actionType);
      if (!behavior) {
        throw new Error(
          `No enabled behavior found for ${link.target_agent} with action ${actionType}.`
        );
      }

      const outcome = await runBehavior(behavior, {
        trigger: "collaborate",
        source_agent: sourceAgent,
        strength: link.strength ?? 0.5,
        context: link.context ?? {},
      });

      results.push({
        link_id: link.id,
        target_agent: link.target_agent,
        collaboration_type: collaboration,
        action_type: actionType,
        success: true,
        outcome,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.error("[agents.collaborate] Link execution failed", {
        link: link.id,
        target: link.target_agent,
        actionType,
        message,
      });
      results.push({
        link_id: link.id,
        target_agent: link.target_agent,
        collaboration_type: collaboration,
        action_type: actionType,
        success: false,
        error: message,
      });
    }
  }

  return NextResponse.json({
    success: true,
    source_agent: sourceAgent,
    links_executed: results.length,
    results,
  });
}
