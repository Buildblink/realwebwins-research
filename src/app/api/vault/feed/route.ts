import { NextResponse } from "next/server";
import { fetchVaultFeed } from "@/lib/vaultData";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const projects = await fetchVaultFeed({ limit: 10 });
    return NextResponse.json({
      success: true,
      projects,
    });
  } catch (error) {
    console.error("[vault.feed] Failed to load public feed", error);
    const message =
      error instanceof Error ? error.message : "Unable to load vault feed.";
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
