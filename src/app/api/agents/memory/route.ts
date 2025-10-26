import { NextResponse } from "next/server";
import {
  getAgentMemory,
  upsertAgentMemory,
} from "@/lib/agents/memory";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get("topic");
  const agentId = searchParams.get("agent_id");
  const q = searchParams.get("q");
  const limit = Number.parseInt(searchParams.get("limit") ?? "50", 10);

  try {
    const data = await getAgentMemory({
      topic,
      agent_id: agentId,
      search: q,
      limit: Number.isFinite(limit) && limit > 0 ? limit : 50,
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: "FETCH_FAILED",
        message,
      },
      { status: 500 }
    );
  }
}

interface MemoryPayload {
  id?: string;
  agent_id?: string;
  topic?: string;
  content?: string;
  summary?: string | null;
  importance?: number | null;
  metadata?: Record<string, unknown> | null;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as MemoryPayload;

  if (!payload.agent_id || !payload.topic || !payload.content) {
    return NextResponse.json(
      {
        success: false,
        error: "MISSING_FIELDS",
        message: "agent_id, topic, and content are required.",
      },
      { status: 400 }
    );
  }

  try {
    const entry = await upsertAgentMemory({
      id: payload.id,
      agent_id: payload.agent_id,
      topic: payload.topic,
      content: payload.content,
      summary: payload.summary ?? null,
      importance: payload.importance ?? null,
      metadata: payload.metadata ?? null,
    });

    return NextResponse.json({ success: true, data: entry });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: "UPSERT_FAILED",
        message,
      },
      { status: 500 }
    );
  }
}
