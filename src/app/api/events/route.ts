import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { EVENT_TYPES, type EventType } from "@/lib/eventTypes";

interface EventPayload {
  event: string;
  context?: Record<string, unknown>;
  user_id?: string;
}

async function logToAgentStatus(message: string, error?: string) {
  try {
    const supabase = getSupabaseAdminClient();
    await supabase.from("AgentStatus").insert([
      {
        idea: "analytics",
        stage: "event_tracking",
        success: !error,
        error_log: error ?? null,
        last_run: new Date().toISOString(),
      },
    ]);
  } catch (logError) {
    console.warn("[events.api] AgentStatus logging failed", logError);
  }
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as EventPayload;
    const { event, context = {}, user_id } = body;

    // Validate event type
    if (!event || typeof event !== "string") {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_EVENT",
          message: "Event type is required and must be a string.",
        },
        { status: 400 }
      );
    }

    // Validate context is an object if provided
    if (context && typeof context !== "object") {
      return NextResponse.json(
        {
          success: false,
          error: "INVALID_CONTEXT",
          message: "Context must be a valid JSON object.",
        },
        { status: 400 }
      );
    }

    const supabase = getSupabaseAdminClient();

    // Insert event into user_events table
    const { data, error } = await supabase
      .from("user_events")
      .insert([
        {
          user_id: user_id ?? null,
          event,
          context: context ?? {},
          created_at: new Date().toISOString(),
        },
      ])
      .select()
      .single();

    if (error) {
      console.error("[events.api] Failed to insert event", error);
      await logToAgentStatus("Event insertion failed", error.message);

      return NextResponse.json(
        {
          success: false,
          error: "EVENT_INSERT_FAILED",
          message: "Failed to record event.",
        },
        { status: 500 }
      );
    }

    // Successful tracking
    return NextResponse.json({
      success: true,
      data: {
        eventId: data.id,
        event,
        timestamp: data.created_at,
      },
    });
  } catch (error) {
    console.error("[events.api] Request failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    await logToAgentStatus("Event API failed", message);

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Unable to process event.",
      },
      { status: 500 }
    );
  }
}

// GET endpoint for retrieving user events (for dashboard/analytics)
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");
    const event = searchParams.get("event");
    const limit = parseInt(searchParams.get("limit") ?? "100", 10);
    const offset = parseInt(searchParams.get("offset") ?? "0", 10);

    const supabase = getSupabaseAdminClient();

    let query = supabase
      .from("user_events")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    // Apply filters
    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (event) {
      query = query.eq("event", event);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("[events.api] Failed to fetch events", error);
      return NextResponse.json(
        {
          success: false,
          error: "EVENT_FETCH_FAILED",
          message: "Failed to retrieve events.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: data ?? [],
      pagination: {
        total: count ?? 0,
        limit,
        offset,
      },
    });
  } catch (error) {
    console.error("[events.api] GET request failed", error);
    const message = error instanceof Error ? error.message : "Unknown error";

    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: "Unable to fetch events.",
      },
      { status: 500 }
    );
  }
}
