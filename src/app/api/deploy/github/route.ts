
import { NextResponse } from "next/server";
import { createUserOctokit, pushRepository } from "@/lib/integrations/github";
import { createDeployAudit } from "@/lib/deploys/audit";
import { getMVPOutput } from "@/lib/mvp/outputs";
import { getProjectSnapshot } from "@/lib/mvp/projectSnapshot";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json(
      { success: false, error: "INVALID_PAYLOAD" },
      { status: 400 }
    );
  }

  const {
    mvp_id: mvpId,
    repo_name: repoName,
    private: isPrivate = true,
    readme,
    github_token: githubToken,
  } = body as {
    mvp_id: string;
    repo_name: string;
    private?: boolean;
    readme?: string;
    github_token?: string;
  };

  if (!mvpId || !repoName || !githubToken) {
    return NextResponse.json(
      { success: false, error: "MISSING_FIELDS" },
      { status: 400 }
    );
  }

  try {
    const output = await getMVPOutput(mvpId);
    if (!output) {
      return NextResponse.json(
        { success: false, error: "MVP_NOT_FOUND" },
        { status: 404 }
      );
    }

    const snapshot = await getProjectSnapshot(mvpId);
    const files = snapshot?.files ?? {};

    const octokit = createUserOctokit(githubToken);
    const result = await pushRepository(octokit, {
      repoName,
      privateRepo: isPrivate,
      files: Object.fromEntries(
        Object.entries(files).map(([path, entry]) => [path, entry.content])
      ),
      readme,
    });

    const deploy = await createDeployAudit({
      mvpId,
      provider: "github",
      status: "pushed",
      repoUrl: result.repoUrl,
      metadata: { commit: result.commitSha },
    });

    return NextResponse.json({
      success: true,
      deploy_id: deploy.id,
      repo_url: result.repoUrl,
      commit_sha: result.commitSha,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[deploy.github]", message);
    return NextResponse.json(
      { success: false, error: "GITHUB_DEPLOY_FAILED", message },
      { status: 500 }
    );
  }
}
