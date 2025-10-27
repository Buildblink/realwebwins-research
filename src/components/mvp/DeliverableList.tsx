
"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { DeliverablePreview, type ArtifactViewModel, type ExportViewModel } from "@/components/mvp/DeliverablePreview";
import { UpgradeModal } from "@/components/ui/UpgradeModal";
import { canAccessTier } from "@/middleware/tierGate";
import { Button } from "@/components/ui/button";

interface DeliverableListProps {
  mvpId: string;
  artifacts: ArtifactViewModel[];
  exports: ExportViewModel[];
  userTier?: string | null;
  onRefresh?: () => Promise<void> | void;
}

export function DeliverableList({
  mvpId,
  artifacts,
  exports,
  userTier,
  onRefresh,
}: DeliverableListProps) {
  const router = useRouter();
  const [upgradeTarget, setUpgradeTarget] = useState<{
    tier: string | null | undefined;
    title: string;
    description?: string;
  } | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const grouped = useMemo(() => {
    return {
      artifacts: [...artifacts].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
      exports: [...exports].sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    };
  }, [artifacts, exports]);

  const refresh = useCallback(async () => {
    if (onRefresh) {
      await onRefresh();
      return;
    }
    router.refresh();
  }, [onRefresh, router]);

  const patchViewed = useCallback(async (exportRecord: ExportViewModel) => {
    await fetch(`/api/exports/${exportRecord.id}/viewed`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
    });
  }, []);

  const requestDownload = useCallback(
    async (
      record: ArtifactViewModel | ExportViewModel,
      kind: "artifact" | "export"
    ) => {
      if (!canAccessTier(userTier, record.tier ?? "free")) {
        setUpgradeTarget({
          tier: record.tier,
          title:
            "artifact_type" in record
              ? record.title ?? record.artifact_type
              : (record.metadata?.title as string) ?? record.export_type,
          description: "Upgrade to unlock this deliverable and download full content.",
        });
        return;
      }

      try {
        setLoadingId(record.id);
        if (kind === "export") {
          const exportRecord = record as ExportViewModel;
          const downloadUrl =
            exportRecord.download_url ?? `/api/export/mvp/${mvpId}`;
          window.open(downloadUrl, "_blank", "noopener,noreferrer");
          await patchViewed(exportRecord);
        } else {
          // Fall back to full export for artifact downloads
          window.open(`/api/export/mvp/${mvpId}`, "_blank", "noopener,noreferrer");
        }
      } finally {
        setLoadingId(null);
        await refresh();
      }
    },
    [userTier, mvpId, patchViewed, refresh]
  );

  const revalidateArtifact = useCallback(
    async (artifact: ArtifactViewModel) => {
      if (!canAccessTier(userTier, artifact.tier ?? "free")) {
        setUpgradeTarget({
          tier: artifact.tier,
          title: artifact.title ?? artifact.artifact_type,
          description: "Upgrade to run validation on premium deliverables.",
        });
        return;
      }

      try {
        setLoadingId(artifact.id);
        await fetch("/api/artifacts/validate", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            artifact_id: artifact.id,
            type: artifact.artifact_type,
            format: artifact.format ?? "text",
            content: artifact.content,
            preview_html: artifact.preview_html,
            tier: artifact.tier,
          }),
        });
      } finally {
        setLoadingId(null);
        await refresh();
      }
    },
    [userTier, refresh]
  );

  const markExportViewed = useCallback(
    async (exportRecord: ExportViewModel) => {
      if (!canAccessTier(userTier, exportRecord.tier ?? "free")) {
        setUpgradeTarget({
          tier: exportRecord.tier,
          title: (exportRecord.metadata?.title as string) ?? exportRecord.export_type,
          description: "Upgrade to interact with premium exports.",
        });
        return;
      }
      try {
        setLoadingId(exportRecord.id);
        await patchViewed(exportRecord);
      } finally {
        setLoadingId(null);
        await refresh();
      }
    },
    [userTier, patchViewed, refresh]
  );

  return (
    <div className="space-y-10">
      <section className="space-y-4">
        <header className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-100">Artifacts</h2>
            <p className="text-sm text-slate-400">
              Generated deliverables from agent collaboration.
            </p>
          </div>
          <Button variant="outline" onClick={refresh}>
            Refresh list
          </Button>
        </header>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {grouped.artifacts.map((artifact) => (
            <DeliverablePreview
              key={artifact.id}
              artifact={artifact}
              userTier={userTier}
              onDownload={() => requestDownload(artifact, "artifact")}
              onValidate={() => revalidateArtifact(artifact)}
              footer={
                loadingId === artifact.id ? (
                  <span className="text-xs text-slate-400">Processing…</span>
                ) : null
              }
            />
          ))}
          {grouped.artifacts.length === 0 ? (
            <p className="col-span-full text-sm text-slate-500">
              No artifacts generated yet.
            </p>
          ) : null}
        </div>
      </section>

      <section className="space-y-4">
        <header>
          <h2 className="text-xl font-semibold text-slate-100">Exports</h2>
          <p className="text-sm text-slate-400">
            Downloadable packages generated for this MVP.
          </p>
        </header>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {grouped.exports.map((exportRecord) => (
            <DeliverablePreview
              key={exportRecord.id}
              exportRecord={exportRecord}
              userTier={userTier}
              onDownload={() => requestDownload(exportRecord, "export")}
              onMarkViewed={() => markExportViewed(exportRecord)}
              footer={
                loadingId === exportRecord.id ? (
                  <span className="text-xs text-slate-400">Preparing download…</span>
                ) : null
              }
            />
          ))}
          {grouped.exports.length === 0 ? (
            <p className="col-span-full text-sm text-slate-500">
              No exports generated yet. Trigger an export to see it listed here.
            </p>
          ) : null}
        </div>
      </section>

      <UpgradeModal
        open={Boolean(upgradeTarget)}
        currentTier={userTier}
        requiredTier={upgradeTarget?.tier}
        onClose={() => setUpgradeTarget(null)}
        onUpgrade={() => {
          setUpgradeTarget(null);
          window.open("/pricing", "_blank");
        }}
        description={upgradeTarget?.description}
      >
        <p className="text-slate-300">
          Upgrade unlocks premium artifacts, export automation, and faster validation.
        </p>
      </UpgradeModal>
    </div>
  );
}
