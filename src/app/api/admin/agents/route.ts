import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

function adminEnabled() {
  return process.env.ADMIN_MODE === "true";
}

function unauthorizedResponse() {
  return NextResponse.json(
    { success: false, error: "ADMIN_DISABLED", message: "Admin mode is disabled." },
    { status: 403 }
  );
}

function pickDefaultProvider() {
  if (process.env.OPENAI_API_KEY) {
    return { provider: "openai", model: "gpt-4o-mini" };
  }
  if (process.env.ANTHROPIC_API_KEY) {
    return { provider: "anthropic", model: "claude-3-5-sonnet-20240620" };
  }
  if (process.env.GOOGLE_API_KEY) {
    return { provider: "gemini", model: "gemini-1.5-flash" };
  }
  return { provider: "local", model: "local-llm" };
}

function normalizePayload(body: Record<string, unknown>) {
  const temperature =
    typeof body.temperature === "number"
      ? body.temperature
      : typeof body.temperature === "string"
      ? Number.parseFloat(body.temperature)
      : undefined;

  return {
    name: typeof body.name === "string" ? body.name.trim() : undefined,
    role: typeof body.role === "string" ? body.role.trim() : undefined,
    prompt: typeof body.prompt === "string" ? body.prompt : undefined,
    mode: typeof body.mode === "string" ? body.mode : undefined,
    llm_provider:
      typeof body.llm_provider === "string" ? body.llm_provider.toLowerCase() : undefined,
    llm_model: typeof body.llm_model === "string" ? body.llm_model : undefined,
    temperature: Number.isFinite(temperature) ? temperature : undefined,
    enabled:
      typeof body.enabled === "boolean"
        ? body.enabled
        : typeof body.enabled === "string"
        ? body.enabled === "true"
        : undefined,
    version:
      typeof body.version === "number"
        ? Math.max(1, Math.floor(body.version))
        : undefined,
  };
}

export async function GET() {
  if (!adminEnabled()) {
    return unauthorizedResponse();
  }
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_definitions")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { success: false, error: "AGENT_LIST_FAILED", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}

export async function POST(request: Request) {
  if (!adminEnabled()) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const supabase = getSupabaseAdminClient();
  const payload = normalizePayload(body);

  if (!payload.name || !payload.prompt) {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_PAYLOAD",
        message: "Agent name and prompt are required.",
      },
      { status: 400 }
    );
  }

  const defaults = pickDefaultProvider();
  const llmProvider = payload.llm_provider ?? defaults.provider;
  const llmModel = payload.llm_model ?? defaults.model;

  const insertPayload = {
    name: payload.name,
    role: payload.role ?? null,
    prompt: payload.prompt,
    mode: payload.mode ?? "relay",
    llm_provider: llmProvider,
    llm_model: llmModel,
    temperature: payload.temperature ?? 0.7,
    enabled: payload.enabled ?? true,
    version: payload.version ?? 1,
  };

  const { data, error } = await supabase
    .from("agent_definitions")
    .insert([insertPayload])
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: "AGENT_CREATE_FAILED", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function PATCH(request: Request) {
  if (!adminEnabled()) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  const id =
    typeof body.id === "string"
      ? body.id
      : typeof body.agent_id === "string"
      ? body.agent_id
      : null;

  if (!id) {
    return NextResponse.json(
      { success: false, error: "MISSING_ID", message: "Agent id is required." },
      { status: 400 }
    );
  }

  const updates = normalizePayload(body);
  const updatePayload: Record<string, unknown> = { updated_at: new Date().toISOString() };

  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      updatePayload[key] = value;
    }
  });

  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_definitions")
    .update(updatePayload)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { success: false, error: "AGENT_UPDATE_FAILED", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function DELETE(request: Request) {
  if (!adminEnabled()) {
    return unauthorizedResponse();
  }

  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { success: false, error: "MISSING_ID", message: "id query parameter required." },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("agent_definitions").delete().eq("id", id);

  if (error) {
    return NextResponse.json(
      { success: false, error: "AGENT_DELETE_FAILED", message: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, deleted: id });
}
