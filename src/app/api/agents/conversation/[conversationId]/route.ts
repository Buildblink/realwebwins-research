import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: { conversationId: string } }
) {
  const { conversationId } = context.params;
  const supabase = getSupabaseAdminClient();

  try {
    const { data, error } = await supabase
      .from("agent_messages")
      .select("*")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("[conversation.GET] Failed to fetch messages:", error);
      return NextResponse.json(
        { success: false, error: "DB_FETCH_FAILED" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      messages: data ?? [],
    });
  } catch (err) {
    console.error("[conversation.GET] Unexpected error:", err);
    return NextResponse.json(
      { success: false, error: "UNEXPECTED_ERROR" },
      { status: 500 }
    );
  }
}
