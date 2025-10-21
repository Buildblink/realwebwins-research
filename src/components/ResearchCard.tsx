'use client';
import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { DatabaseProject } from "@/types/supabase";
import { verdictToVariant } from "@/lib/verdict";
import {
  downloadReportAsPdf,
  getPublicReportUrl,
} from "@/lib/reportDownloader";

type ResearchCardProject = Pick<DatabaseProject, "id" | "title" | "idea_description" | "created_at" | "score" | "verdict"> &
  Partial<DatabaseProject>;

interface ResearchCardProps {
  project: ResearchCardProject;
  index?: number;
  variant?: "default" | "compact";
}

export function ResearchCard({
  project,
  index = 0,
  variant = "default",
}: ResearchCardProps) {
  const isCompact = variant === "compact";
  const projectId = project?.id ?? "";
  const badgeVariant = verdictToVariant(project.verdict ?? "neutral");
  const verdictLabel = project.verdict
    ? project.verdict.replace("_", " ").toUpperCase()
    : "PENDING";
  const createdAtLabel = project.created_at
    ? formatDistanceToNow(new Date(project.created_at), { addSuffix: true })
    : "Unknown";
  const [isDownloading, setIsDownloading] = useState(false);
  const storagePath = useMemo(
    () => (projectId ? `reports/${projectId}.json` : ""),
    [projectId]
  );
  const title = project.title?.trim() || "Untitled Research Report";
  const description =
    project.idea_description?.trim() ||
    "No description was provided for this research run.";

  if (!project.title) {
    console.warn(
      "[ResearchCard] Project is missing a title, falling back to placeholder.",
      projectId
    );
  }
  if (!project.idea_description) {
    console.warn(
      "[ResearchCard] Project is missing an idea description, using fallback.",
      projectId
    );
  }
  if (!project.created_at) {
    console.warn(
      "[ResearchCard] Project is missing created_at, cannot format timestamp.",
      projectId
    );
  }
  if (project.score == null) {
    console.warn(
      "[ResearchCard] Project score missing, showing placeholder.",
      projectId
    );
  }

  const handleDownload = useCallback(async () => {
    if (!storagePath) {
      console.warn(
        "[ResearchCard] Download requested but storage path is unavailable.",
        projectId
      );
      window.alert("No stored report found for this project yet.");
      return;
    }

    try {
      setIsDownloading(true);
      await downloadReportAsPdf(storagePath);
    } catch (error) {
      console.error("[ResearchCard] Failed to download report", error);
      window.alert(
        error instanceof Error
          ? error.message
          : "We could not generate the PDF right now."
      );
    } finally {
      setIsDownloading(false);
    }
  }, [projectId, storagePath]);

  const handleView = useCallback(() => {
    if (!storagePath) {
      console.warn(
        "[ResearchCard] View requested but storage path is unavailable.",
        projectId
      );
      window.alert("No stored report found for this project yet.");
      return;
    }

    const url = getPublicReportUrl(storagePath);
    window.open(url, "_blank", "noopener,noreferrer");
  }, [projectId, storagePath]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Card
        className={`group h-full ${
          isCompact ? "border border-slate-200 bg-white/95 shadow-sm" : ""
        }`}
      >
        <CardHeader className={isCompact ? "pb-3" : undefined}>
          <div className="flex items-start justify-between gap-3">
            <div>
              <Badge variant={badgeVariant}>Verdict: {verdictLabel}</Badge>
              <CardTitle
                className={`${
                  isCompact ? "mt-2 text-lg" : "mt-3 text-xl"
                } font-semibold text-slate-900`}
              >
                {title}
              </CardTitle>
            </div>
            <div
              className={`rounded-full bg-primary/10 font-medium text-primary ${
                isCompact ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm"
              }`}
            >
              {project.score?.toFixed(1) ?? "--"}/10
            </div>
          </div>
        </CardHeader>
        <CardContent className={isCompact ? "space-y-3 pt-0" : "space-y-4"}>
          <p className="line-clamp-3 text-sm text-slate-600">{description}</p>
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>{createdAtLabel}</span>
            <Link
              href={projectId ? `/project/${projectId}` : "#"}
              className="font-semibold text-primary transition group-hover:text-secondary"
            >
              {"View project ->"}
            </Link>
          </div>
          {!isCompact ? (
            <div className="flex flex-wrap gap-2 pt-2">
              <Button
                variant="default"
                size="sm"
                onClick={handleDownload}
                disabled={isDownloading}
                className="gap-2"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>Download PDF</>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleView}
                className="gap-2"
              >
                View JSON
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </motion.div>
  );
}
