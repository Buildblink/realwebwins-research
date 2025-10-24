import { NextResponse } from "next/server";
import {
  assertWorkspaceSection,
  generateWorkspaceSection,
  getWorkspaceSnapshot,
} from "@/lib/workspace/service";

type RouteContext = {
  params: Promise<{ painPointId: string }>;
};

function ensurePainPointId(value: string | undefined): string {
  if (!value) {
    throw new Error("Pain point ID is required.");
  }
  return value;
}

export async function GET(_request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const painPointId = ensurePainPointId(params?.painPointId);
    const snapshot = await getWorkspaceSnapshot(painPointId);
    return NextResponse.json({ success: true, data: snapshot });
  } catch (error) {
    console.error("[workspace.api] GET failed", error);
    return NextResponse.json(
      {
        success: false,
        error: "WORKSPACE_FETCH_FAILED",
        message: error instanceof Error ? error.message : "Unable to load workspace.",
      },
      { status: 400 }
    );
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const painPointId = ensurePainPointId(params?.painPointId);
    const url = new URL(request.url);
    const section = assertWorkspaceSection(url.searchParams.get("section"));

    const output = await generateWorkspaceSection(painPointId, section);

    return NextResponse.json({
      success: true,
      data: { output, section },
    });
  } catch (error) {
    console.error("[workspace.api] POST failed", error);
    const status = error instanceof Error && error.message.includes("Unsupported") ? 422 : 400;
    return NextResponse.json(
      {
        success: false,
        error: "WORKSPACE_GENERATE_FAILED",
        message: error instanceof Error ? error.message : "Unable to generate workspace output.",
      },
      { status }
    );
  }
}
