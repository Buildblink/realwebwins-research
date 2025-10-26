import { NextResponse } from "next/server";
import {
  getSystemHealthSnapshot,
  recordAgentEvent,
  recordSystemHealth,
} from "@/lib/agents/health";

export async function GET() {
  try {
    const snapshot = await getSystemHealthSnapshot();
    return NextResponse.json({ success: true, data: snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[system.health.GET]", message);
    return NextResponse.json(
      { success: false, error: "HEALTH_FETCH_FAILED", message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      component?: string;
      status?: string;
      details?: Record<string, unknown>;
      agent_event?: {
        agent_id?: string;
        type?: string;
        payload?: Record<string, unknown>;
      };
    };

    if (body.component && body.status) {
      await recordSystemHealth({
        component: body.component,
        status: body.status,
        details: body.details,
      });
    }

    const event = body.agent_event;
    if (event?.agent_id && event?.type) {
      await recordAgentEvent({
        agentId: event.agent_id,
        type: event.type,
        payload: event.payload,
      });
    }

    const snapshot = await getSystemHealthSnapshot();
    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[system.health.POST]", message);
    return NextResponse.json(
      { success: false, error: "HEALTH_UPDATE_FAILED", message },
      { status: 500 }
    );
  }
}
