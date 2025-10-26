import { NextResponse } from "next/server";
import {
  queryPainPoints,
  createPainPoint,
  getPainPointById,
} from "@/lib/painpoints/queryPainPoints";
import type { PainPointFilters, PainPointSeed } from "@/types/painpoint";

function parseFilters(url: URL): PainPointFilters {
  return {
    search: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    niche: url.searchParams.get("niche") ?? undefined,
    source: url.searchParams.get("source") ?? undefined,
    audience: url.searchParams.get("audience") ?? undefined,
    page: url.searchParams.get("page")
      ? Number.parseInt(url.searchParams.get("page") as string, 10)
      : undefined,
    pageSize: url.searchParams.get("pageSize")
      ? Number.parseInt(url.searchParams.get("pageSize") as string, 10)
      : undefined,
  };
}

function isAuthorized(request: Request) {
  const expected = process.env.PAINPOINTS_WRITE_SECRET;
  if (!expected) return true;
  const header = request.headers.get("authorization") ?? "";
  return header === `Bearer ${expected}`;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  try {
    if (id) {
      const painPoint = await getPainPointById(id);
      if (!painPoint) {
        return NextResponse.json(
          { success: false, error: "NOT_FOUND", message: "Pain point not found." },
          { status: 404 }
        );
      }
      return NextResponse.json({ success: true, data: painPoint });
    }

    const filters = parseFilters(url);
    const response = await queryPainPoints(filters);
    return NextResponse.json({ success: true, ...response });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[painpoints.GET]", message);
    return NextResponse.json(
      { success: false, error: "PAINPOINT_FETCH_FAILED", message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json(
      { success: false, error: "UNAUTHORIZED" },
      { status: 401 }
    );
  }

  const payload = (await request.json().catch(() => null)) as PainPointSeed | null;
  if (!payload || typeof payload.text !== "string") {
    return NextResponse.json(
      {
        success: false,
        error: "INVALID_BODY",
        message: "Payload must include a text field.",
      },
      { status: 400 }
    );
  }

  try {
    const record = await createPainPoint(payload);
    return NextResponse.json({ success: true, data: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { success: false, error: "PAINPOINT_CREATE_FAILED", message },
      { status: 500 }
    );
  }
}
