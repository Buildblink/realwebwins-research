import { NextResponse } from "next/server";
import { syncInsightsToMemory } from "@/lib/agents/memory";

/**
 * POST /api/cron/agents-sync
 * Aggregates recent agent insights into shared memory.
 * Requires WEEKLY_SUMMARY_SECRET header for authorization.
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.WEEKLY_SUMMARY_SECRET ?? ""}`;

  if (!process.env.WEEKLY_SUMMARY_SECRET || authHeader !== expectedAuth) {
    console.warn("[agents.sync.cron] Unauthorized attempt");
    return NextResponse.json(
      {
        success: false,
        error: "UNAUTHORIZED",
        message: "Invalid or missing authorization.",
      },
      { status: 401 }
    );
  }

  try {
    const result = await syncInsightsToMemory();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: "SYNC_FAILED",
        message,
      },
      { status: 500 }
    );
  }
}
