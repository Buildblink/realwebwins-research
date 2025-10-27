import { Octokit } from "@octokit/rest";

interface GitHubRepoOptions {
  repoName: string;
  description?: string;
  privateRepo?: boolean;
  files: Record<string, string>;
  readme?: string;
}

export function createUserOctokit(accessToken: string) {
  return new Octokit({ auth: accessToken });
}

export async function pushRepository(
  octokit: Octokit,
  options: GitHubRepoOptions
): Promise<{ repoUrl: string; defaultBranch: string; commitSha: string }> {
  const { repoName, privateRepo = true, description = "", files, readme } = options;

  const { data: user } = await octokit.rest.users.getAuthenticated();

  const { data: repo } = await octokit.rest.repos.createForAuthenticatedUser({
    name: repoName,
    private: privateRepo,
    description,
  });

  const defaultBranch = repo.default_branch ?? "main";

  await octokit.rest.repos.createOrUpdateFileContents({
    owner: user.login,
    repo: repo.name,
    path: "README.md",
    message: "chore: add project README",
    content: Buffer.from(readme ?? "# RealWebWins MVP\n").toString("base64"),
  });

  for (const [path, content] of Object.entries(files)) {
    await octokit.rest.repos.createOrUpdateFileContents({
      owner: user.login,
      repo: repo.name,
      path,
      message: `chore: add ${path}`,
      content: Buffer.from(content).toString("base64"),
    });
  }

  const head = await octokit.rest.repos.getCommit({
    owner: user.login,
    repo: repo.name,
    ref: `heads/${defaultBranch}`,
  });

  return {
    repoUrl: repo.html_url,
    defaultBranch,
    commitSha: head.data.sha,
  };
}
