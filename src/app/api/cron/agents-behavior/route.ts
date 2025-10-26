import { NextResponse } from "next/server";
import {
  listBehaviorsByTrigger,
  runBehavior,
} from "@/lib/agents/behaviors";

/**
 * POST /api/cron/agents-behavior
 * Executes all behaviors configured with trigger_type = 'daily'.
 * Authorised via WEEKLY_SUMMARY_SECRET (shared cron secret).
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.WEEKLY_SUMMARY_SECRET ?? ""}`;

  if (!process.env.WEEKLY_SUMMARY_SECRET || authHeader !== expectedAuth) {
    console.warn("[agents.behavior.cron] Unauthorized attempt");
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
    const behaviors = await listBehaviorsByTrigger("daily");
    let completed = 0;
    let failed = 0;

    for (const behavior of behaviors) {
      try {
        await runBehavior(behavior);
        completed += 1;
      } catch (error) {
        failed += 1;
        console.error(
          `[agents.behavior.cron] Behavior ${behavior.id} failed:`,
          error
        );
      }
    }

    return NextResponse.json({
      success: failed === 0,
      completed,
      failed,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        error: "EXECUTION_ERROR",
        message,
      },
      { status: 500 }
    );
  }
}
