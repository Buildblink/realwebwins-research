import { NextResponse } from "next/server";
import { fetchVaultTags } from "@/lib/vaultData";

function parseBoolean(value: string | null): boolean {
  if (!value) return false;
  return ["1", "true", "yes"].includes(value.toLowerCase());
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const publicOnly = parseBoolean(searchParams.get("public"));
    const tags = await fetchVaultTags({ publicOnly });

    return NextResponse.json({
      success: true,
      tags,
    });
  } catch (error) {
    console.error("[vault.tags] request failed", error);
    const message =
      error instanceof Error ? error.message : "Unable to fetch vault tags.";
    return NextResponse.json(
      { success: false, error: "VAULT_TAGS_ERROR", message },
      { status: 500 }
    );
  }
}
