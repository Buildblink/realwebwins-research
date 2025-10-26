import { NextResponse } from "next/server";
import {
  calculateAgentLeaderboard,
  fetchLeaderboard,
  persistLeaderboard,
} from "@/lib/agents/leaderboard";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limitParam = searchParams.get("limit");
  const limit = Number.parseInt(limitParam ?? "10", 10);

  try {
    const { rows, insights } = await fetchLeaderboard(
      Number.isFinite(limit) && limit > 0 ? limit : 10
    );
    return NextResponse.json({ success: true, data: rows, insights });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[agents.leaderboard.GET]", message);
    return NextResponse.json(
      { success: false, error: "LEADERBOARD_FETCH_FAILED", message },
      { status: 500 }
    );
  }
}

export async function POST() {
  try {
    const { entries, insights } = await calculateAgentLeaderboard();

    if (entries.length === 0) {
      return NextResponse.json({
        success: true,
        updated: 0,
        insights: [],
        message: "No agents available to rank.",
      });
    }

    await persistLeaderboard(entries, insights);

    return NextResponse.json({
      success: true,
      updated: entries.length,
      insights,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[agents.leaderboard.POST]", message);
    return NextResponse.json(
      { success: false, error: "LEADERBOARD_COMPUTE_FAILED", message },
      { status: 500 }
    );
  }
}
