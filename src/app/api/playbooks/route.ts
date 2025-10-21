import { NextResponse } from "next/server";
import { queryPlaybooks } from "@/lib/playbooks/queryPlaybooks";

function parseNumber(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const category = searchParams.get("category") ?? undefined;
    const niche = searchParams.get("niche") ?? undefined;
    const page = parseNumber(searchParams.get("page"), 1);
    const pageSize = parseNumber(searchParams.get("pageSize"), 20);

    const result = await queryPlaybooks({
      category,
      niche,
      page,
      pageSize,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: {
        page: result.page,
        pageSize: result.pageSize,
        total: result.total,
        totalPages: result.totalPages,
      },
    });
  } catch (error) {
    console.error("[playbooks.api] request failed", error);
    const message =
      error instanceof Error ? error.message : "Unable to fetch playbooks.";
    return NextResponse.json(
      { success: false, error: "PLAYBOOKS_ERROR", message },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "NOT_IMPLEMENTED",
      message: "Playbooks endpoint is read-only. Use GET with filters instead.",
    },
    { status: 405 }
  );
}
