import { NextResponse } from "next/server";
import { fetchPublicLeaderboardSnapshot } from "@/lib/agents/summary";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const limit = Number.parseInt(searchParams.get("limit") ?? "10", 10);

  try {
    const snapshot = await fetchPublicLeaderboardSnapshot(
      Number.isFinite(limit) && limit > 0 ? limit : 10
    );
    return NextResponse.json({ success: true, data: snapshot });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[public.leaderboard.GET]", message);
    return NextResponse.json(
      { success: false, error: "PUBLIC_LEADERBOARD_FAILED", message },
      { status: 500 }
    );
  }
}
