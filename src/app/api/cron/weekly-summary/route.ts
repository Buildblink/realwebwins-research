import { NextResponse } from "next/server";
import {
  calculateAgentLeaderboard,
  persistLeaderboard,
} from "@/lib/agents/leaderboard";
import {
  buildWeeklySummary,
  sendWeeklySummaryEmail,
  storeWeeklySummary,
} from "@/lib/agents/summary";

function isAuthorized(request: Request) {
  const expected = process.env.WEEKLY_SUMMARY_SECRET;
  if (!expected) {
    console.warn(
      "[weekly-summary.cron] WEEKLY_SUMMARY_SECRET not set; rejecting request."
    );
    return false;
  }
  const header = request.headers.get("authorization");
  return header === `Bearer ${expected}`;
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
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
    const recompute = await calculateAgentLeaderboard();

    if (recompute.entries.length > 0) {
      await persistLeaderboard(recompute.entries, recompute.insights);
    }

    const summary = await buildWeeklySummary({
      entries: recompute.entries,
      insights: recompute.insights,
    });

    const record = await storeWeeklySummary({
      weekStart: summary.weekStart,
      report: summary.report,
      markdown: summary.markdown,
    });

    await sendWeeklySummaryEmail({
      markdown: summary.markdown,
      subject: `RealWebWins Weekly Summary (${summary.weekStart})`,
    });

    return NextResponse.json({
      success: true,
      stored: record?.id ?? null,
      weekStart: summary.weekStart,
      agents: recompute.entries.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[weekly-summary.cron] Failed to generate summary", error);
    return NextResponse.json(
      {
        success: false,
        error: "SUMMARY_FAILED",
        message,
      },
      { status: 500 }
    );
  }
}
