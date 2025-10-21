import { NextResponse } from "next/server";
import { fetchVaultProjects } from "@/lib/vaultData";

function parseStage(stage: string | null): "research" | "plan" | "playbook" | null {
  if (!stage) return null;
  const normalized = stage.toLowerCase();
  if (["plan", "actionplan"].includes(normalized)) return "plan";
  if (["playbook", "playbookcomplete"].includes(normalized)) return "playbook";
  if (["research"].includes(normalized)) return "research";
  return null;
}

function parseNumber(value: string | null, fallback: number): number {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseBoolean(value: string | null): boolean {
  if (!value) return false;
  return ["1", "true", "yes"].includes(value.toLowerCase());
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);

    const tag = searchParams.get("tag");
    const stage = parseStage(searchParams.get("stage"));
    const q = searchParams.get("q");
    const page = parseNumber(searchParams.get("page"), 1);
    const pageSize = parseNumber(searchParams.get("pageSize"), 20);
    const limit = searchParams.has("limit")
      ? parseNumber(searchParams.get("limit"), pageSize)
      : null;
    const publicOnly = parseBoolean(searchParams.get("public"));

    const { projects, total } = await fetchVaultProjects({
      tag,
      stage,
      q,
      page,
      pageSize,
      limit: limit ?? undefined,
      publicOnly,
    });

    const effectivePageSize = limit ?? pageSize;
    const totalPages =
      limit != null
        ? 1
        : Math.max(1, Math.ceil(total / (effectivePageSize || 1)));

    return NextResponse.json({
      success: true,
      data: projects,
      pagination: {
        page,
        pageSize: effectivePageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("[vault.api] request failed", error);
    const message =
      error instanceof Error ? error.message : "Unable to fetch vault data.";
    return NextResponse.json(
      { success: false, error: "VAULT_ERROR", message },
      { status: 500 }
    );
  }
}

export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: "NOT_IMPLEMENTED",
      message: "Vault endpoint is read-only. Use GET with filters instead.",
    },
    { status: 405 }
  );
}
