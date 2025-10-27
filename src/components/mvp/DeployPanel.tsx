"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { TierBadge } from "@/components/ui/TierBadge";
import { canAccessTier } from "@/middleware/tierGate";

interface DeployPanelProps {
  mvpId: string;
  userTier?: string | null;
}

export function DeployPanel({ mvpId, userTier }: DeployPanelProps) {
  const [repoName, setRepoName] = useState(`realwebwins-mvp-${mvpId.slice(0, 6)}`);
  const [isPrivate, setIsPrivate] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [deployId, setDeployId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string>("Connect GitHub and push the starter repo.");
  const locked = !canAccessTier(userTier, "pro");

  async function handleDeploy() {
    if (locked) {
      setStatusMessage("Upgrade to Pro to use GitHub deployment.");
      return;
    }
    setConnecting(true);
    try {
      const response = await fetch("/api/deploy/github", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mvp_id: mvpId,
          repo_name: repoName,
          private: isPrivate,
          github_token: process.env.NEXT_PUBLIC_GITHUB_DEV_TOKEN,
        }),
      });
      const json = await response.json();
      if (!response.ok || !json?.success) {
        throw new Error(json?.message ?? "GitHub deployment failed");
      }
      setDeployId(json.deploy_id);
      setStatusMessage(`Repository created at ${json.repo_url}.`);
    } catch (error) {
      setStatusMessage(
        error instanceof Error ? error.message : "Failed to deploy."
      );
    } finally {
      setConnecting(false);
    }
  }

  return (
    <Card className="border-slate-800 bg-slate-950/60 text-slate-100">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          Deploy to GitHub
          <TierBadge tier="pro" />
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <div>
          <label className="mb-1 block text-xs uppercase tracking-wide text-slate-400">
            Repository Name
          </label>
          <Input
            value={repoName}
            onChange={(event) => setRepoName(event.target.value)}
            disabled={connecting}
            className="bg-slate-900 border-slate-800"
          />
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-slate-400">
          <input
            type="checkbox"
            checked={isPrivate}
            onChange={(event) => setIsPrivate(event.target.checked)}
            disabled={connecting}
            className="accent-indigo-500"
          />
          Private repository
        </label>
        <p className="rounded-md border border-slate-800 bg-slate-950/50 p-3 text-xs text-slate-400">
          Status: {statusMessage}
          {deployId ? (
            <>
              <br />
              Deploy ID: <code className="text-slate-300">{deployId}</code>
            </>
          ) : null}
        </p>
      </CardContent>
      <CardFooter>
        <Button onClick={handleDeploy} disabled={connecting || locked} className="w-full">
          {locked ? "Upgrade to unlock" : connecting ? "Deploying..." : "Deploy to GitHub"}
        </Button>
      </CardFooter>
    </Card>
  );
}
