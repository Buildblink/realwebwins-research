import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import {
  fetchBehavior,
  runBehavior,
  validateBehaviorRow,
  type AgentBehavior,
} from "@/lib/agents/behaviors";

interface BehaviorPayload {
  id?: string;
  name?: string;
  description?: string;
  agent_id?: string;
  action_type?: string;
  action?: string;
  trigger_type?: string;
  config?: Record<string, unknown>;
  enabled?: boolean;
  run?: boolean;
  parameters?: Record<string, unknown>;
}

export async function GET() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_behaviors")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[agents.behavior] Failed to fetch behaviors:", error);
    return NextResponse.json(
      {
        success: false,
        error: "DB_ERROR",
        message: "Unable to load agent behaviors.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as BehaviorPayload;

  if (body.run && body.id) {
    try {
      const behavior = await fetchBehavior(body.id);
      const outcome = await runBehavior(behavior, body.parameters ?? {});
      return NextResponse.json({
        success: true,
        behavior,
        outcome,
        reflectionTriggered: Array.isArray(outcome.sync),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      const status = message.includes("not found") ? 404 : 500;
      return NextResponse.json(
        { success: false, error: "EXECUTION_FAILED", message },
        { status }
      );
    }
  }

  if (!body.agent_id || (!body.action_type && !body.action)) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_FIELDS",
        message: "agent_id and action_type are required.",
      },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  const actionType = (body.action_type ?? body.action ?? "").trim();
  const name =
    body.name ??
    `${body.agent_id}-${actionType || "behavior"}`.toLowerCase();
  const description = body.description ?? body.trigger_type ?? null;
  const config = {
    ...(body.config ?? {}),
    ...(body.trigger_type ? { trigger_type: body.trigger_type } : {}),
    ...(body.parameters ? { parameters: body.parameters } : {}),
  };

  const insertPayload = {
    agent_id: body.agent_id,
    name,
    description,
    action_type: actionType || "analyze",
    config,
    enabled: body.enabled ?? true,
  };

  const { data, error } = await supabase
    .from("agent_behaviors")
    .insert([insertPayload])
    .select()
    .single();

  if (error || !validateBehaviorRow(data)) {
    console.error("[agents.behavior] Failed to create behavior:", {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      payload: insertPayload,
    });
    return NextResponse.json(
      {
        success: false,
        error: "DB_ERROR",
        message: "Unable to create behavior.",
      },
      { status: 500 }
    );
  }

  const behavior = data as AgentBehavior;

  if (body.run) {
    try {
      const outcome = await runBehavior(behavior, body.parameters ?? {});
      return NextResponse.json({
        success: true,
        behavior,
        outcome,
        reflectionTriggered: Array.isArray(outcome.sync),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return NextResponse.json(
        { success: false, error: "EXECUTION_FAILED", message },
        { status: 500 }
      );
    }
  }

  const cleanBehavior = {
  ...behavior,
  id: typeof behavior.id === "string" ? behavior.id.split(" ")[0].trim() : behavior.id,
};

return NextResponse.json({ success: true, behavior: cleanBehavior });
}
