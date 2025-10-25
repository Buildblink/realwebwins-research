import { NextResponse } from "next/server";
import { getAgentNetwork } from "@/lib/agents/network";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const graph = await getAgentNetwork();
    return NextResponse.json({ success: true, ...graph });
  } catch (error) {
    console.error("[agents.network] Failed to build network:", error);
    const message =
      error instanceof Error ? error.message : "Unable to load agent network.";
    return NextResponse.json(
      { success: false, error: "NETWORK_ERROR", message },
      { status: 500 }
    );
  }
}
