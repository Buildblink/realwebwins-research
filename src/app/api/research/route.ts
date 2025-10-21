import { NextResponse } from "next/server";

const HELP_MESSAGE =
  "Research API root is a health endpoint. Use /api/research/create for POST and /api/research/list for GET.";

export async function GET() {
  return NextResponse.json({
    success: true,
    message: HELP_MESSAGE,
    endpoints: {
      list: "/api/research/list",
      create: "/api/research/create",
      detail: "/api/research/[projectId]",
    },
  });
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "NOT_IMPLEMENTED",
      message: HELP_MESSAGE,
    },
    { status: 405 }
  );
}
