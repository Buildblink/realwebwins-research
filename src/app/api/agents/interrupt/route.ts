import { randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { appendSessionTranscript } from "@/lib/agents/sessions";

interface InterruptPayload {
  session_id?: string;
  author?: string;
  message?: string;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as InterruptPayload;

  if (!payload.session_id || !payload.message) {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_PAYLOAD",
        message: "session_id and message are required.",
      },
      { status: 400 }
    );
  }

  try {
    await appendSessionTranscript(payload.session_id, {
      id: randomUUID(),
      agent: payload.author ?? "user",
      role: "user",
      content: payload.message,
      created_at: new Date().toISOString(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: "INTERRUPT_FAILED", message },
      { status: 500 }
    );
  }
}
