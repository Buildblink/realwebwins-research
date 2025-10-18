import Link from "next/link";
import { notFound } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportViewer } from "@/components/ReportViewer";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { verdictToVariant } from "@/lib/verdict";
import type { ResearchGeneratedData } from "@/types/research";

interface ProjectPageProps {
  params: {
    id: string;
  };
}

async function fetchProject(id: string) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("research_projects")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    throw error;
  }

  return data;
}

export default async function ProjectDetailPage({ params }: ProjectPageProps) {
  try {
    const project = await fetchProject(params.id);
    if (!project) {
      return notFound();
    }

    const verdictVariant = verdictToVariant(project.verdict ?? "neutral");
    const verdictLabel = project.verdict
      ? project.verdict.replace("_", " ").toUpperCase()
      : "PENDING";
    const researchJson =
      (project.research_json as ResearchGeneratedData | null) ?? null;

    return (
      <div className="space-y-8">
        <div className="flex flex-col gap-4 rounded-2xl border border-foreground/10 bg-white/80 p-8 shadow-sm lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <Badge variant={verdictVariant}>Verdict - {verdictLabel}</Badge>
            <h2 className="font-heading text-3xl font-semibold text-slate-900">
              {project.title}
            </h2>
            <p className="text-sm text-slate-500">
              {project.idea_description}
            </p>
          </div>
          <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
            <div className="rounded-xl bg-primary/10 px-4 py-3 text-primary">
              <p className="text-xs uppercase tracking-wide">Score</p>
              <p className="font-heading text-3xl">
                {project.score?.toFixed(1) ?? "--"}
              </p>
            </div>
            <Button asChild variant="outline">
              <Link href="/dashboard">Back to dashboard</Link>
            </Button>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.6fr_1fr]">
          <ReportViewer
            markdown={
              project.research_report ??
              "Research report is not available for this project."
            }
          />
          <div className="space-y-4 rounded-2xl border border-foreground/10 bg-white/70 p-6 shadow-inner">
            <h3 className="font-heading text-lg text-slate-900">
              Raw JSON snapshot
            </h3>
            {researchJson ? (
              <pre className="max-h-[520px] overflow-auto rounded-xl bg-slate-900/90 p-4 text-xs text-slate-100">
                {JSON.stringify(researchJson, null, 2)}
              </pre>
            ) : (
              <p className="text-sm text-slate-500">
                JSON payload not available for this project yet.
              </p>
            )}
            <div className="rounded-xl border border-secondary/40 bg-secondary/10 p-4 text-xs text-secondary/90">
              Phase 2 placeholder: Marketing Playbook & Action Plan generators
              will live here.
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error("[project.detail] error", error);
    return (
      <div className="space-y-4 rounded-xl border border-danger/40 bg-danger/10 p-6 text-danger">
        <p className="font-semibold">Something went wrong</p>
        <p className="text-sm text-danger/80">
          Unable to load this project. It might have been deleted or you may not
          have access.
        </p>
        <Button asChild variant="outline">
          <Link href="/dashboard">Return to dashboard</Link>
        </Button>
      </div>
    );
  }
}
