import fetch from "node-fetch";

interface TriggerOptions {
  repoSlug: string;
  projectName: string;
  accessToken: string;
  deployHookUrl?: string;
}

export async function triggerVercelDeploy(options: TriggerOptions) {
  const { accessToken, deployHookUrl, projectName } = options;

  if (deployHookUrl) {
    const response = await fetch(deployHookUrl, { method: "POST" });
    if (!response.ok) {
      throw new Error(
        `Failed to trigger Vercel deploy hook (${response.status} ${response.statusText})`
      );
    }
    return {
      deployUrl: null,
      buildId: await response.text(),
    };
  }

  const res = await fetch("https://api.vercel.com/v13/deployments", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      name: projectName,
      gitSource: {
        repoId: options.repoSlug,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to trigger Vercel deploy (${res.status})`);
  }

  const data = (await res.json()) as {
    url?: string;
    id?: string;
  };

  return {
    deployUrl: data.url ? `https://${data.url}` : null,
    buildId: data.id ?? null,
  };
}
