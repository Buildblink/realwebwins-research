import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import OpenAI from "openai";

interface RelayPayload {
  conversation_id?: string;
  sender_agent?: string;
  receiver_agent?: string;
  content?: string;
}

const openaiClient =
  process.env.OPENAI_API_KEY !== undefined
    ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    : null;

export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();
  const body = (await request.json().catch(() => ({}))) as RelayPayload;
  const { conversation_id, sender_agent, receiver_agent, content } = body;

  if (
    !conversation_id ||
    !sender_agent ||
    !receiver_agent ||
    !content ||
    typeof conversation_id !== "string" ||
    typeof sender_agent !== "string" ||
    typeof receiver_agent !== "string" ||
    typeof content !== "string"
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_FIELDS",
        message:
          "conversation_id, sender_agent, receiver_agent, and content are required.",
      },
      { status: 400 }
    );
  }

  const { data: history, error: historyError } = await supabase
    .from("agent_messages")
    .select("*")
    .eq("conversation_id", conversation_id)
    .order("created_at", { ascending: false })
    .limit(5);

  if (historyError) {
    console.error("[agents.relay] Failed to load conversation history:", historyError);
  }

  const context =
    history
      ?.reverse()
      .map(
        (message) =>
          `${message.sender_agent}: ${message.content ?? ""}`.trim()
      )
      .join("\n") ?? "";

  if (!openaiClient) {
    console.warn("[agents.relay] OPENAI_API_KEY missing, skipping relay response");
    return NextResponse.json({
      success: false,
      error: "OPENAI_DISABLED",
      message: "OPENAI_API_KEY not configured. Relay reply skipped.",
    });
  }

  const response = await openaiClient.chat.completions.create({
    model: process.env.OPENAI_AGENT_MODEL ?? "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are agent ${receiver_agent}. Continue the conversation thoughtfully and concisely.`,
      },
      {
        role: "user",
        content: `${sender_agent}: ${content}\n\nContext:\n${context}`,
      },
    ],
  });

  const reply = response.choices[0]?.message?.content ?? "(no reply)";

  try {
  const { error } = await supabase.from("agent_messages").insert({
    conversation_id,
    sender_agent,
    receiver_agent,
    content: reply,
  });

  if (error) {
    console.error("🧨 Supabase insert error:", error.message || JSON.stringify(error));
    return NextResponse.json({
      success: false,
      error: "DB_ERROR",
      message: error.message || JSON.stringify(error),
      reply,
    });
  }

  return NextResponse.json({
    success: true,
    reply,
  });
} catch (e) {
  console.error("🔥 Fatal relay error:", e);
  return NextResponse.json({
    success: false,
    error: "UNEXPECTED_ERROR",
    message: e instanceof Error ? e.message : String(e),
  });
}


  return NextResponse.json({ success: true, reply });
}
