
"use client";

import { ReactNode } from "react";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TierBadge } from "@/components/ui/TierBadge";
import { canAccessTier } from "@/middleware/tierGate";

export interface ArtifactViewModel {
  id: string;
  artifact_type: string;
  title: string | null;
  format: string | null;
  preview_html: string | null;
  content: unknown;
  validation_status: string;
  tier: string | null;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface ExportViewModel {
  id: string;
  export_type: string;
  tier: string | null;
  download_url: string | null;
  viewed_at: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

type Kind = "artifact" | "export";

interface DeliverablePreviewProps {
  artifact?: ArtifactViewModel;
  exportRecord?: ExportViewModel;
  userTier?: string | null;
  onDownload?: () => void;
  onValidate?: (() => void) | null;
  onMarkViewed?: (() => void) | null;
  footer?: ReactNode;
}

export function DeliverablePreview({
  artifact,
  exportRecord,
  userTier,
  onDownload,
  onValidate,
  onMarkViewed,
  footer,
}: DeliverablePreviewProps) {
  const kind: Kind = artifact ? "artifact" : "export";
  const title =
    artifact?.title ??
    (exportRecord?.metadata?.title as string | undefined) ??
    displayName(kind, artifact?.artifact_type, exportRecord?.export_type);
  const tier = artifact?.tier ?? exportRecord?.tier ?? "free";
  const locked = !canAccessTier(userTier, tier);
  const status =
    artifact?.validation_status ??
    (exportRecord?.viewed_at ? "viewed" : "pending");

  const statusColor =
    status === "valid"
      ? "text-emerald-300"
      : status === "invalid"
      ? "text-rose-300"
      : status === "warning"
      ? "text-amber-300"
      : "text-slate-400";

  return (
    <Card className="bg-slate-900/60 border-slate-800 hover:border-slate-700 transition-colors">
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg font-semibold text-slate-100">
            {title}
          </CardTitle>
          <p className={`text-xs uppercase tracking-wide ${statusColor}`}>
            {statusLabel(status)}
          </p>
        </div>
        <TierBadge tier={tier} />
      </CardHeader>
      <CardContent className="space-y-4 text-sm text-slate-300">
        {artifact ? renderArtifactPreview(artifact) : renderExportPreview(exportRecord!)}
        {locked ? (
          <p className="text-amber-300 text-sm font-medium">
            Upgrade required to unlock this deliverable.
          </p>
        ) : null}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-3">
        {onDownload ? (
          <Button
            onClick={onDownload}
            disabled={locked}
            variant={locked ? "secondary" : "default"}
          >
            {kind === "artifact" ? "Download Artifact" : "Download Export"}
          </Button>
        ) : null}
        {kind === "artifact" && onValidate ? (
          <Button
            variant="outline"
            onClick={onValidate}
            disabled={locked}
          >
            Re-run Validation
          </Button>
        ) : null}
        {kind === "export" && onMarkViewed && !exportRecord?.viewed_at ? (
          <Button variant="outline" onClick={onMarkViewed} disabled={locked}>
            Mark as viewed
          </Button>
        ) : null}
        {footer}
      </CardFooter>
    </Card>
  );
}

function renderArtifactPreview(artifact: ArtifactViewModel) {
  if (artifact.preview_html) {
    return (
      <div
        className="prose prose-invert max-w-none bg-slate-950/60 border border-slate-800 rounded-lg p-4 text-sm"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: artifact.preview_html }}
      />
    );
  }

  const content =
    typeof artifact.content === "string"
      ? artifact.content
      : JSON.stringify(artifact.content, null, 2);

  return (
    <pre className="max-h-64 overflow-auto rounded-lg bg-slate-950/50 p-4 text-xs leading-relaxed text-slate-200">
      {content || "No preview available."}
    </pre>
  );
}

function renderExportPreview(exportRecord: ExportViewModel) {
  const lines: Array<[string, string | number | null]> = [
    ["Type", exportRecord.export_type],
    ["Created", new Date(exportRecord.created_at).toLocaleString()],
    [
      "Viewed",
      exportRecord.viewed_at ? new Date(exportRecord.viewed_at).toLocaleString() : "Never",
    ],
  ];
  return (
    <dl className="grid grid-cols-2 gap-2 text-xs text-slate-400">
      {lines.map(([label, value]) => (
        <div key={label} className="flex flex-col">
          <dt className="font-semibold text-slate-500">{label}</dt>
          <dd className="text-slate-200">{String(value ?? "—")}</dd>
        </div>
      ))}
    </dl>
  );
}

function displayName(kind: Kind, artifactType?: string, exportType?: string) {
  if (kind === "artifact") {
    return artifactType ? humanize(artifactType) : "Artifact";
  }
  return exportType ? humanize(exportType) : "Export";
}

function humanize(value?: string | null) {
  if (!value) return "Unknown";
  return value
    .replace(/[_-]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusLabel(status: string) {
  switch (status) {
    case "valid":
      return "Validated";
    case "invalid":
      return "Validation failed";
    case "warning":
      return "Validation warnings";
    case "viewed":
      return "Viewed";
    default:
      return "Pending review";
  }
}
