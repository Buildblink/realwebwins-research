import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

function resolveCardPath(slug: string) {
  const safeSlug = slug.replace(/[^a-z0-9\-]/gi, "");
  return path.join(process.cwd(), "exports", "cards", `${safeSlug}.png`);
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  const { slug } = await context.params;
  const filePath = resolveCardPath(slug);

  try {
    const buffer = await fs.readFile(filePath);
    const body = new Uint8Array(buffer);
    return new NextResponse(body, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "card_not_found",
        slug,
        message,
      },
      { status: 404 }
    );
  }
}
