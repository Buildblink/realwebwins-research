
import { NextResponse } from "next/server";
import { getDeployRecord } from "@/lib/deploys/audit";

export async function GET(
  _request: Request,
  { searchParams }: { searchParams: URLSearchParams }
) {
  const deployId = searchParams.get("deploy_id");
  if (!deployId) {
    return NextResponse.json(
      { success: false, error: "MISSING_DEPLOY_ID" },
      { status: 400 }
    );
  }

  try {
    const record = await getDeployRecord(deployId);
    if (!record) {
      return NextResponse.json(
        { success: false, error: "DEPLOY_NOT_FOUND" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, deploy: record });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[deploy.status]", message);
    return NextResponse.json(
      { success: false, error: "DEPLOY_STATUS_FAILED", message },
      { status: 500 }
    );
  }
}
