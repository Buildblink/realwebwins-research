import { NextResponse } from "next/server";
import { answerWorkspaceQuestion } from "@/lib/workspace/service";

type RouteContext = {
  params: Promise<{ painPointId: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const params = await context.params;
    const painPointId = params?.painPointId;
    if (!painPointId) {
      throw new Error("Pain point ID is required.");
    }

    const body = (await request.json().catch(() => ({}))) as { question?: string };
    const question = body.question ?? "";

    const result = await answerWorkspaceQuestion(painPointId, question);

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("[workspace.ask.api] request failed", error);
    const status = error instanceof Error && error.message.includes("empty") ? 422 : 400;
    return NextResponse.json(
      {
        success: false,
        error: "WORKSPACE_ASK_FAILED",
        message: error instanceof Error ? error.message : "Unable to generate copilot answer.",
      },
      { status }
    );
  }
}
