import { NextResponse } from "next/server";
import { runBehaviorFeedbackOptimization } from "@/lib/agents/feedback";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.WEEKLY_SUMMARY_SECRET ?? ""}`;

  if (!process.env.WEEKLY_SUMMARY_SECRET || authHeader !== expectedAuth) {
    console.warn("[agents.feedback.cron] Unauthorized attempt");
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  try {
    const result = await runBehaviorFeedbackOptimization();
    return NextResponse.json({ success: true, result });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: "FEEDBACK_FAILED", message },
      { status: 500 }
    );
  }
}
