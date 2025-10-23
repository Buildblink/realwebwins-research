import { NextResponse } from "next/server";
import { getWorkspaceSnapshot } from "@/lib/workspace/service";

type RouteContext = { params: Promise<{ painPointId: string }> };

function ensurePainPointId(value: string | undefined): string {
  if (!value) throw new Error("Pain point ID is required.");
  return value;
}

export async function GET(_req: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const painPointId = ensurePainPointId(params?.painPointId);
    const snapshot = await getWorkspaceSnapshot(painPointId);
    return NextResponse.json({
      success: true,
      data: {
        message: "Deliverables bundle ready.",
        painPointId,
        snapshot,
      },
    });
  } catch (error) {
    console.error("[workspace.deliverables] GET failed", error);
    return NextResponse.json(
      {
        success: false,
        error: "DELIVERABLES_FETCH_FAILED",
        message:
          error instanceof Error
            ? error.message
            : "Unable to generate deliverables bundle.",
      },
      { status: 400 }
    );
  }
}

// allow POST as alias (fixes 405)
export async function POST(req: Request, context: RouteContext) {
  return GET(req, context);
}
