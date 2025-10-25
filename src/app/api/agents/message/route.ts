import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface AgentMessagePayload {
  conversation_id?: string;
  sender_agent?: string;
  receiver_agent?: string;
  role?: string;
  content?: string;
  meta?: unknown;
}

const REQUIRED_FIELDS: Array<keyof Required<AgentMessagePayload>> = [
  "conversation_id",
  "sender_agent",
  "receiver_agent",
  "content",
];

function resolveRelayUrl(request: Request): string {
  const configuredBase = process.env.NEXT_PUBLIC_API_BASE;
  if (configuredBase) {
    return `${configuredBase.replace(/\/$/, "")}/api/agents/relay`;
  }

  const { origin } = new URL(request.url);
  return `${origin}/api/agents/relay`;
}

export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();
  const body = (await request.json().catch(() => ({}))) as AgentMessagePayload;

  const missing = REQUIRED_FIELDS.filter(
    (field) => !body[field] || typeof body[field] !== "string"
  );

  if (missing.length > 0) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_FIELDS",
        message: `Missing required fields: ${missing.join(", ")}`,
      },
      { status: 400 }
    );
  }

  const { conversation_id, sender_agent, receiver_agent, role, content, meta } =
    body;

  const { data, error } = await supabase
    .from("agent_messages")
    .insert([
      {
        conversation_id,
        sender_agent,
        receiver_agent,
        role: role ?? "assistant",
        content,
        meta: meta ?? {},
      },
    ])
    .select()
    .single();

  if (error) {
    console.error("[agents.message] Insert failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "DB_ERROR",
        message: "Unable to record agent message.",
      },
      { status: 500 }
    );
  }

  const relayUrl = resolveRelayUrl(request);
  try {
    await fetch(relayUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversation_id,
        sender_agent,
        receiver_agent,
        content,
      }),
    });
  } catch (relayError) {
    console.warn("[agents.message] Relay trigger failed:", relayError);
  }

  return NextResponse.json({ success: true, data });
}
