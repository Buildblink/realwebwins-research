'use client';

import { useCallback, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DeliverablesApiResponse } from "@/hooks/useWorkspace";
import { normalizeDeliverable, renderWorkspacePdf } from "@/lib/export/pdf";

interface DeliverablesCardProps {
  workspaceTitle: string;
  onExport: () => Promise<DeliverablesApiResponse | null>;
  isLoading: boolean;
  error?: string | null;
}

export function DeliverablesCard({
  workspaceTitle,
  onExport,
  isLoading,
  error,
}: DeliverablesCardProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleExport = useCallback(async () => {
    if (isLoading || isDownloading) return;
    setIsDownloading(true);
    setSuccessMessage(null);
    try {
      const apiResult = await onExport();
      if (!apiResult) {
        return;
      }
      const bundle = normalizeDeliverable(apiResult, workspaceTitle);
      await renderWorkspacePdf(bundle);
      setSuccessMessage("Exported bundle as PDF.");
    } catch (err) {
      console.error("deliverables export failed", err);
      setSuccessMessage(null);
    } finally {
      setIsDownloading(false);
    }
  }, [isDownloading, isLoading, onExport, workspaceTitle]);

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-white/5 bg-[#111113]/80 p-4">
      <div>
        <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[#4f46e5]">
          Deliverables
        </h3>
        <p className="text-xs text-zinc-500">
          Pull every section into a ready-to-share bundle or drop assets into
          your ops stack.
        </p>
      </div>

      <div className="flex flex-col gap-3 text-sm text-zinc-300">
        <Item label="Workspace PDF" description="Full markdown stitched into a founder-friendly deck." />
        <Item label="Playbook Summary" description="Launch checklist + KPIs pulled from the Build section." />
        <Item label="Tool Stash" description="Suggested stack and validation tools for quick bookmarking." />
      </div>

      {error && (
        <p className="text-xs text-rose-400">
          {error}
        </p>
      )}
      {successMessage && (
        <p className="text-xs text-emerald-400">
          {successMessage}
        </p>
      )}

      <Button
        onClick={handleExport}
        disabled={isLoading || isDownloading}
        className="w-full bg-gradient-to-r from-[#4f46e5] to-[#22d3ee] text-black hover:opacity-90"
      >
        {isLoading || isDownloading ? "Compiling..." : "Export as PDF"}
      </Button>
    </div>
  );
}

interface ItemProps {
  label: string;
  description: string;
}

function Item({ label, description }: ItemProps) {
  return (
    <div className="rounded-xl border border-white/5 bg-[#0e0e10]/70 px-3 py-2">
      <p className="text-xs font-semibold text-zinc-200">{label}</p>
      <p className="text-xs text-zinc-500">{description}</p>
    </div>
  );
}

