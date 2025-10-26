import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface LinkPayload {
  source_agent?: string;
  target_agent?: string;
  collaboration_type?: string;
  relationship?: string;
  strength?: number;
  context?: unknown;
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();
  const body = (await request.json().catch(() => ({}))) as LinkPayload;

  const sourceAgent = body.source_agent?.trim();
  const targetAgent = body.target_agent?.trim();
  const collaborationType =
    body.collaboration_type?.trim().toLowerCase() ??
    body.relationship?.trim().toLowerCase() ??
    "relay";
  const strength =
    typeof body.strength === "number" && Number.isFinite(body.strength)
      ? Math.max(0, Math.min(1, body.strength))
      : 0.5;

  if (!sourceAgent || !targetAgent) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_FIELDS",
        message: "source_agent and target_agent are required.",
      },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from("agent_links")
    .insert([
      {
        source_agent: sourceAgent,
        target_agent: targetAgent,
        collaboration_type: collaborationType,
        strength,
        context:
          typeof body.context === "object" && body.context !== null
            ? body.context
            : {},
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("[agents.link] Failed to create link:", error);
    return NextResponse.json(
      {
        success: false,
        error: "DB_ERROR",
        message: "Unable to create agent link.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data });
}

export async function GET() {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_links")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[agents.link] Failed to fetch links:", error);
    return NextResponse.json(
      {
        success: false,
        error: "DB_ERROR",
        message: "Unable to load agent links.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, data: data ?? [] });
}
