import { NextResponse } from "next/server";
import { runLLM } from "@/lib/llm/runLLM";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export async function POST(request: Request) {
  if (process.env.ADMIN_MODE !== "true") {
    return NextResponse.json(
      { success: false, error: "ADMIN_DISABLED", message: "Admin mode is disabled." },
      { status: 403 }
    );
  }

  const body = (await request.json().catch(() => ({}))) as {
    provider?: string;
    model?: string;
    prompt?: string;
    temperature?: number;
  };

  if (!body.prompt) {
    return NextResponse.json(
      { success: false, error: "INVALID_PAYLOAD", message: "prompt is required." },
      { status: 400 }
    );
  }

  try {
    const result = await runLLM({
      agent: {
        prompt: body.prompt,
        llm_provider: body.provider ?? "openai",
        llm_model: body.model ?? "gpt-4o-mini",
        temperature: body.temperature ?? 0.7,
      },
    });

    const supabase = getSupabaseAdminClient();
    await supabase.from("agent_runs").insert([
      {
        agent_id: null,
        input: { prompt: body.prompt },
        output: { content: result.content },
        llm_provider: result.provider,
        llm_model: result.model,
        duration_ms: result.durationMs,
      },
    ]);

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: "PROMPT_TEST_FAILED", message },
      { status: 500 }
    );
  }
}
