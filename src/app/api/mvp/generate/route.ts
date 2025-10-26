import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { getPainPointById } from "@/lib/painpoints/queryPainPoints";
import {
  createAgentSession,
  appendSessionTranscript,
  completeAgentSession,
  type SessionMessage,
} from "@/lib/agents/sessions";
import { createMVPOutput } from "@/lib/mvp/outputs";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface GeneratePayload {
  pain_id?: string;
  started_by?: string;
}

function buildTranscript(painSummary: string): SessionMessage[] {
  const now = new Date().toISOString();
  return [
    {
      id: randomUUID(),
      agent: "agent_researcher",
      role: "assistant",
      created_at: now,
      content: `Researcher: Collected core pain point evidence — "${painSummary}".`,
    },
    {
      id: randomUUID(),
      agent: "agent_builder",
      role: "assistant",
      created_at: new Date(Date.now() + 500).toISOString(),
      content:
        "Builder: Drafting MVP spec with landing page, onboarding email, and core workflow automation.",
    },
    {
      id: randomUUID(),
      agent: "agent_validator",
      role: "assistant",
      created_at: new Date(Date.now() + 1000).toISOString(),
      content:
        "Validator: Highlighting biggest risk (distribution) and recommending early interviews + preorders.",
    },
  ];
}

function deriveMVPTitle(summary: string) {
  if (!summary) return "AI-Generated MVP Concept";
  const max = 48;
  const trimmed = summary.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}...` : trimmed;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as GeneratePayload;

  if (!payload.pain_id) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_PAIN_ID",
        message: "Provide a pain_id to generate an MVP.",
      },
      { status: 400 }
    );
  }

  try {
    const painPoint = await getPainPointById(payload.pain_id);
    if (!painPoint) {
      return NextResponse.json(
        { success: false, error: "PAIN_NOT_FOUND", message: "Unknown pain point." },
        { status: 404 }
      );
    }

    const session = await createAgentSession({
      painId: painPoint.id,
      startedBy: payload.started_by ?? null,
      metadata: {
        pain_summary: painPoint.summary ?? painPoint.text,
        category: painPoint.category,
      },
    });

    const transcript = buildTranscript(painPoint.summary ?? painPoint.text);
    for (const message of transcript) {
      await appendSessionTranscript(session.id, message);
    }

    const output = await createMVPOutput({
      sessionId: session.id,
      title: deriveMVPTitle(painPoint.summary ?? painPoint.text),
      summary: `MVP focused on solving "${painPoint.summary ?? painPoint.text}".`,
      stack: "Next.js + Supabase + Resend + Tailwind",
      pricing: "Launch with $49/mo subscription and annual option at $490.",
      risk: "Primary risk: insufficient distribution. Mitigate via 10 customer interviews.",
      validationScore: 0.72,
      downloadUrls: {},
    });

    await completeAgentSession(session.id, {
      metadata: {
        ...session.metadata,
        transcript_length: transcript.length,
        mvp_output_id: output.id,
      },
    });

    const supabase = getSupabaseAdminClient();
    void supabase.from("AgentStatus").insert([
      {
        idea: "pain_mvp",
        stage: "generate",
        success: true,
        meta: {
          session_id: session.id,
          mvp_id: output.id,
          transcript_count: transcript.length,
        },
        last_run: new Date().toISOString(),
      },
    ]);

    return NextResponse.json({
      success: true,
      session_id: session.id,
      mvp_id: output.id,
      transcript,
      output,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[mvp.generate]", message);
    return NextResponse.json(
      { success: false, error: "MVP_GENERATION_FAILED", message },
      { status: 500 }
    );
  }
}
