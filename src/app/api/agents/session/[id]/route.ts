import { NextResponse } from "next/server";
import { getAgentSession } from "@/lib/agents/sessions";
import { getMVPOutputBySession } from "@/lib/mvp/outputs";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const session = await getAgentSession(id);
    const output = await getMVPOutputBySession(id);

    if (!session && !output) {
      return NextResponse.json(
        { success: false, error: "SESSION_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      session,
      output,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const status = message.includes("not found") ? 404 : 500;

    console.error("[agents/session] GET error:", message);

    return NextResponse.json(
      { success: false, error: "SESSION_FETCH_FAILED", message },
      { status }
    );
  }
}
