import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import ReportViewer from "@/components/ReportViewer";
import ProjectStrategyPanels from "@/components/ProjectStrategyPanels";
import { VaultPublishingControls } from "@/components/VaultPublishingControls";
import { verdictToVariant } from "@/lib/verdict";
import type {
  ActionPlanRecord,
  DatabaseProject,
  PlaybookRecord,
} from "@/types/supabase";
import type { ResearchGeneratedData } from "@/types/research";

type ProjectRecord = (DatabaseProject & Record<string, unknown>) | null;

interface ProjectDetailPageProps {
  project: ProjectRecord;
  actionPlan: Pick<ActionPlanRecord, "markdown" | "created_at"> | null;
  playbook: Pick<PlaybookRecord, "markdown" | "created_at"> | null;
  errorMessage?: string | null;
  showPublishingControls: boolean;
}

function safeParseResearchJson(
  raw: unknown,
  projectId: string
): ResearchGeneratedData | null {
  if (!raw) {
    console.warn(
      "[ProjectDetail] research_json is empty, skipping render.",
      projectId
    );
    return null;
  }

  if (typeof raw === "string") {
    try {
      return JSON.parse(raw) as ResearchGeneratedData;
    } catch (error) {
      console.warn(
        "[ProjectDetail] Failed to parse stringified research_json.",
        projectId,
        error
      );
      return null;
    }
  }

  if (typeof raw === "object") {
    return raw as ResearchGeneratedData;
  }

  console.warn(
    "[ProjectDetail] Unexpected research_json type, skipping render.",
    projectId,
    typeof raw
  );
  return null;
}

function resolveScore(project: NonNullable<ProjectRecord>): number | null {
  const verdictScore = (project as { verdict_score?: unknown }).verdict_score;
  if (typeof verdictScore === "number") {
    return verdictScore;
  }
  if (typeof project.score === "number") {
    return project.score;
  }
  return null;
}

export default function ProjectDetailPage({
  project,
  actionPlan,
  playbook,
  errorMessage,
  showPublishingControls,
}: ProjectDetailPageProps) {
  if (errorMessage) {
    return (
      <div className="space-y-4 rounded-xl border border-danger/40 bg-danger/10 p-6 text-danger">
        <p className="font-semibold">Something went wrong</p>
        <p className="text-sm text-danger/80">{errorMessage}</p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Return to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="space-y-4 rounded-xl border border-amber-200 bg-amber-50 p-6 text-amber-700">
        <p className="font-semibold">Project not found</p>
        <p className="text-sm text-amber-600">
          The project you are looking for does not exist or was removed.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  if (
    typeof project.research_report !== "string" ||
    project.research_report.trim().length === 0
  ) {
    console.warn(
      "[ProjectDetail] No research_report found for project:",
      project.id,
      project.research_report
    );
    return (
      <div className="p-10 text-center text-slate-500">
        No report available yet.
      </div>
    );
  }

  const verdictValue =
    typeof project.verdict === "string" && project.verdict.trim().length > 0
      ? project.verdict
      : null;
  if (!verdictValue) {
    console.warn(
      "[ProjectDetail] verdict missing, defaulting to neutral.",
      project.id
    );
  }

  const verdictVariant = verdictToVariant(verdictValue ?? "neutral");
  const verdictLabel = verdictValue
    ? verdictValue.replace("_", " ").toUpperCase()
    : "PENDING";
  const parsedResearchJson = safeParseResearchJson(
    project.research_json,
    project.id
  );
  const researchJson = parsedResearchJson ?? {};
  if (!parsedResearchJson) {
    console.warn(
      "[ProjectDetail] research_json missing or invalid, using empty object.",
      project.id
    );
  }

  const safeTitle =
    typeof project.title === "string" && project.title.trim().length > 0
      ? project.title
      : "Untitled Project";
  if (safeTitle === "Untitled Project") {
    console.warn(
      "[ProjectDetail] Project title missing, applying fallback.",
      project.id
    );
  }

  const safeDescription =
    typeof project.idea_description === "string" &&
    project.idea_description.trim().length > 0
      ? project.idea_description
      : "No description available.";
  if (safeDescription === "No description available.") {
    console.warn(
      "[ProjectDetail] idea_description missing, using placeholder.",
      project.id
    );
  }

  const rawMarkdown = project.research_report.trim();
  const safeScore = resolveScore(project);
  if (safeScore == null) {
    console.warn(
      "[ProjectDetail] score missing or not numeric, using placeholder.",
      project.id,
      project.score,
      (project as { verdict_score?: unknown }).verdict_score
    );
  }

  console.groupCollapsed("[ProjectPage] Supabase Payload");
  console.table(project);
  console.groupEnd();

  const isPublic = Boolean((project as { is_public?: boolean }).is_public);
  const tagList = Array.isArray((project as { tags?: unknown }).tags)
    ? ((project as { tags?: string[] }).tags ?? [])
        .filter((tag): tag is string => typeof tag === "string" && tag.trim().length > 0)
        .map((tag) => tag.trim())
    : [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-foreground/10 bg-white/80 p-8 shadow-sm lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2">
          <Badge variant={verdictVariant}>Verdict - {verdictLabel}</Badge>
          <h2 className="font-heading text-3xl font-semibold text-slate-900">
            {safeTitle}
          </h2>
          <p className="text-sm text-slate-500">{safeDescription}</p>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
            <Badge variant={isPublic ? "success" : "neutral"}>
              {isPublic ? "Public vault" : "Private"}
            </Badge>
            {tagList.length > 0
              ? tagList.map((tag) => (
                <Badge key={tag} variant="neutral">
                    {tag}
                  </Badge>
                ))
              : (
                <Badge variant="neutral">Untagged</Badge>
              )}
          </div>
        </div>
        <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
          <div className="rounded-xl bg-primary/10 px-4 py-3 text-primary">
            <p className="text-xs uppercase tracking-wide">Score</p>
            <p className="font-heading text-3xl">
              {safeScore != null ? safeScore.toFixed(1) : "--"}
            </p>
          </div>
          <Button asChild variant="outline">
            <Link href="/dashboard">Back to dashboard</Link>
          </Button>
        </div>
      </div>

      {showPublishingControls ? (
        <VaultPublishingControls
          projectId={project.id}
          initialIsPublic={isPublic}
          initialTags={tagList}
        />
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <ReportViewer markdown={rawMarkdown} />
          <ProjectStrategyPanels
            projectId={project.id}
            researchJson={parsedResearchJson}
            initialActionPlanMarkdown={actionPlan?.markdown ?? null}
            initialPlaybookMarkdown={playbook?.markdown ?? null}
          />
        </div>
        <div className="space-y-4 rounded-2xl border border-foreground/10 bg-white/70 p-6 shadow-inner">
          <h3 className="font-heading text-lg text-slate-900">
            Raw JSON snapshot
          </h3>
          {Object.keys(researchJson).length > 0 ? (
            <pre className="max-h-[520px] overflow-auto rounded-xl bg-slate-900/90 p-4 text-xs text-slate-100">
              {JSON.stringify(researchJson, null, 2)}
            </pre>
          ) : (
            <p className="text-sm text-slate-500">
              JSON payload not available for this project yet.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
