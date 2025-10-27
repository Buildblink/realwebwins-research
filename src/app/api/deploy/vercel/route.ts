
import { NextResponse } from "next/server";
import { triggerVercelDeploy } from "@/lib/integrations/vercel";
import { updateDeployAudit } from "@/lib/deploys/audit";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { success: false, error: "INVALID_PAYLOAD" },
      { status: 400 }
    );
  }

  const {
    deploy_id: deployId,
    repo_slug: repoSlug,
    project_name: projectName,
    vercel_token: vercelToken = process.env.VERCEL_API_TOKEN,
    deploy_hook_url: deployHookUrl = process.env.VERCEL_DEPLOY_HOOK_URL,
  } = body as {
    deploy_id: string;
    repo_slug: string;
    project_name: string;
    vercel_token?: string;
    deploy_hook_url?: string;
  };

  if (!deployId || !repoSlug || !projectName || !vercelToken) {
    return NextResponse.json(
      { success: false, error: "MISSING_FIELDS" },
      { status: 400 }
    );
  }

  try {
    const result = await triggerVercelDeploy({
      repoSlug,
      projectName,
      accessToken: vercelToken,
      deployHookUrl,
    });

    const updated = await updateDeployAudit(deployId, {
      status: result.deployUrl ? "building" : "pending",
      deploy_url: result.deployUrl,
      metadata: {
        buildId: result.buildId,
      },
    });

    return NextResponse.json({ success: true, deploy: updated });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[deploy.vercel]", message);
    return NextResponse.json(
      { success: false, error: "VERCEL_DEPLOY_FAILED", message },
      { status: 500 }
    );
  }
}
