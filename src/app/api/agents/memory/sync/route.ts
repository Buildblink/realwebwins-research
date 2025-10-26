import { NextResponse } from "next/server";
import { syncInsightsToMemory } from "@/lib/agents/memory";

export async function POST() {
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
