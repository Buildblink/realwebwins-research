import { NextResponse } from "next/server";
import { runLLM } from "@/lib/llm/runLLM";
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

async function loadLLMDefaults() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("system_settings")
    .select("value")
    .eq("key", "llm_provider")
    .maybeSingle();

  if (error) {
    console.warn("[admin.test-llm] Failed to load system settings", error.message);
  }

  const value = (data?.value ?? {}) as {
    provider?: string;
    model?: string;
    temperature?: number;
  };

  return {
    provider: value.provider ?? "openai",
    model: value.model ?? "gpt-4o-mini",
    temperature:
      typeof value.temperature === "number" && Number.isFinite(value.temperature)
        ? value.temperature
        : 0.7,
  };
}

export async function POST(request: Request) {
  if (!adminEnabled()) {
    return unauthorizedResponse();
  }

  const body = (await request.json().catch(() => ({}))) as {
    prompt?: string;
    provider?: string;
    model?: string;
    temperature?: number;
  };

  if (!body.prompt) {
    return NextResponse.json(
      { success: false, error: "INVALID_PAYLOAD", message: "prompt is required." },
      { status: 400 }
    );
  }

  const defaults = await loadLLMDefaults();
  const provider = (body.provider ?? defaults.provider ?? "openai").toLowerCase();

  if (provider === "local") {
    return NextResponse.json(
      {
        success: false,
        error: "UNSUPPORTED_PROVIDER",
        message: "Local provider is not available in admin test endpoint.",
      },
      { status: 400 }
    );
  }

  const model = body.model ?? defaults.model ?? "gpt-4o-mini";
  const temperature =
    typeof body.temperature === "number" && Number.isFinite(body.temperature)
      ? body.temperature
      : defaults.temperature;

  try {
    const result = await runLLM({
      agent: {
        prompt: body.prompt,
        llm_provider: provider,
        llm_model: model,
        temperature,
      },
    });

    const supabase = getSupabaseAdminClient();
    await supabase.from("agent_run_metrics").insert([
      {
        agent_id: null,
        llm_provider: result.provider,
        llm_model: result.model,
        duration_ms: result.durationMs,
        tokens: result.tokens ?? 0,
        success: true,
      },
    ]);

    return NextResponse.json({
      success: true,
      data: {
        provider: result.provider,
        model: result.model,
        durationMs: result.durationMs,
        tokens: result.tokens ?? null,
        content: result.content,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: "LLM_TEST_FAILED", message },
      { status: 500 }
    );
  }
}
