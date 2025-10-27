"use client";

import { useMemo } from "react";
import { TierBadge } from "@/components/ui/TierBadge";
import { canAccessTier } from "@/middleware/tierGate";

interface PreviewPaneProps {
  filePath: string | null;
  file:
    | {
        mime: string;
        tier?: string | null;
        preview?: string | null;
        size: number;
      }
    | undefined;
  userTier?: string | null;
}

export function PreviewPane({ filePath, file, userTier }: PreviewPaneProps) {
  const locked = useMemo(
    () => file && !canAccessTier(userTier, file.tier ?? "free"),
    [file, userTier]
  );

  if (!filePath || !file) {
    return (
      <div className="flex h-full items-center justify-center rounded-lg border border-slate-800 bg-slate-950/40">
        <p className="text-slate-500">Select a file to preview.</p>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-lg border border-slate-800 bg-slate-950/50">
      <header className="flex items-center justify-between border-b border-slate-800 px-4 py-2">
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-slate-100">{filePath}</span>
          <span className="text-xs text-slate-500">{file.mime}</span>
        </div>
        <TierBadge tier={file.tier} />
      </header>
      <main className="flex-1 overflow-auto p-6 text-sm text-slate-200">
        {locked ? (
          <div className="rounded-lg border border-amber-400/50 bg-amber-500/10 p-6 text-amber-200">
            Upgrade required to view this file.
          </div>
        ) : (
          renderPreview(file)
        )}
      </main>
    </div>
  );
}

function renderPreview(file: { mime: string; preview?: string | null }) {
  const content = file.preview ?? "Preview unavailable.";

  if (file.mime.startsWith("image/")) {
    return (
      <img
        src={`data:${file.mime};base64,${Buffer.from(content).toString("base64")}`}
        alt="Preview"
        className="max-h-[480px] rounded-lg border border-slate-800 object-contain"
      />
    );
  }

  if (file.mime === "text/html") {
    return (
      <iframe
        title="HTML preview"
        className="h-[480px] w-full rounded-lg border border-slate-800 bg-white"
        srcDoc={content}
      />
    );
  }

  return (
    <pre className="whitespace-pre-wrap break-words rounded-lg bg-slate-950/60 p-4 leading-relaxed">
      {content}
    </pre>
  );
}
