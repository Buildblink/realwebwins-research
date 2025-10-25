import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

interface HumanMessagePayload {
  conversation_id?: string;
  content?: string;
  receiver_agent?: string;
}

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
  const body = (await request.json().catch(() => ({}))) as HumanMessagePayload;

  const conversationId = body.conversation_id;
  const content = body.content;
  const receiverAgent = body.receiver_agent ?? "agent_alpha";

  if (
    !conversationId ||
    typeof conversationId !== "string" ||
    !content ||
    typeof content !== "string"
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_FIELDS",
        message: "conversation_id and content are required.",
      },
      { status: 400 }
    );
  }

  const { error } = await supabase.from("agent_messages").insert([
    {
      conversation_id: conversationId,
      sender_agent: "human",
      receiver_agent: receiverAgent,
      role: "user",
      content,
    },
  ]);

  if (error) {
    console.error("[agents.human] Failed to store human message:", error);
    return NextResponse.json(
      {
        success: false,
        error: "DB_ERROR",
        message: "Unable to store message.",
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
        conversation_id: conversationId,
        sender_agent: "human",
        receiver_agent: receiverAgent,
        content,
      }),
    });
  } catch (relayError) {
    console.warn("[agents.human] Relay trigger failed:", relayError);
  }

  return NextResponse.json({ success: true });
}
