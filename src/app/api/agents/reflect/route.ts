import { NextResponse } from "next/server";
import {
  createAgentReflection,
  listAgentReflections,
} from "@/lib/agents/reflection";

// ✅ GET: List recent reflections
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = Number.parseInt(limitParam ?? "50", 10);

  try {
    const reflections = await listAgentReflections(
      Number.isFinite(limit) && limit > 0 ? limit : 50
    );
    return NextResponse.json({ success: true, data: reflections });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[agents.reflect.GET]", message);
    return NextResponse.json(
      { success: false, error: "FETCH_FAILED", message },
      { status: 500 }
    );
  }
}

// ✅ POST: Create new reflection
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    agent_id?: string;
    limit?: number;
    override?: {
      reflection?: string;
      impact?: number;
      confidence?: number;
      behavior_id?: string | null;
    };
  };

  const agentId = body.agent_id ?? "agent_researcher";

  try {
    const reflection = await createAgentReflection({
      agentId,
      limit: body.limit ?? 20,
      override: body.override,
    });
    return NextResponse.json({ success: true, data: reflection });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[agents.reflect.POST] Reflection failed", error);
    return NextResponse.json(
      { success: false, error: "REFLECTION_FAILED", message },
      { status: 500 }
    );
  }
}
