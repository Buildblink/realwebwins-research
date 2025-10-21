import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { fetchVaultProjectDetail } from "@/lib/vaultData";
import ReportViewer from "@/components/ReportViewer";
import ActionPlanViewer from "@/components/ActionPlanViewer";
import PlaybookViewer from "@/components/PlaybookViewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { VaultShareButton } from "@/components/VaultShareButton";

function stageLabel(stage: "research" | "plan" | "playbook"): { label: string; variant: "neutral" | "warning" | "success" } {
  switch (stage) {
    case "plan":
      return { label: "Action Plan", variant: "warning" };
    case "playbook":
      return { label: "Playbook", variant: "success" };
    default:
      return { label: "Research", variant: "neutral" };
  }
}

export const dynamic = "force-dynamic";

export default async function VaultDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const detail = await fetchVaultProjectDetail(id, { requirePublic: true });

  if (!detail) {
    notFound();
  }

  const stage = stageLabel(detail.stage);
  const publishedAt = detail.created_at
    ? format(new Date(detail.created_at), "MMMM d, yyyy")
    : "Unknown";
  const shareUrl = `/vault/${detail.id}`;

  return (
    <main className="mx-auto max-w-4xl space-y-10 px-4 py-12">
      <header className="space-y-6 rounded-3xl border border-slate-200 bg-white/90 p-8 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={stage.variant}>{stage.label}</Badge>
          <span className="text-xs uppercase tracking-wide text-slate-500">
            Published {publishedAt}
          </span>
          <VaultShareButton url={shareUrl} />
        </div>
        <div className="space-y-4">
          <h1 className="font-heading text-3xl font-semibold text-slate-900">
            {detail.title ?? "Untitled Research"}
          </h1>
          <p className="text-sm text-slate-600">{detail.idea_description}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {detail.tags.length > 0 ? (
            detail.tags.map((tag) => (
              <Badge key={tag} variant="neutral">
                {tag}
              </Badge>
            ))
          ) : (
            <Badge variant="neutral">Untagged</Badge>
          )}
        </div>
        <div className="flex flex-wrap gap-3 text-sm text-slate-600">
          {detail.verdict ? (
            <span>
              Verdict: <span className="font-semibold">{detail.verdict}</span>
            </span>
          ) : null}
          {typeof detail.score === "number" ? (
            <span>
              Score: <span className="font-semibold">{detail.score.toFixed(1)}/10</span>
            </span>
          ) : null}
        </div>
      </header>

      <section className="space-y-6">
        {detail.research_report ? (
          <ReportViewer markdown={detail.research_report} />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-500">
            This project does not have a published research report yet.
          </div>
        )}

        {detail.action_plan_markdown ? (
          <ActionPlanViewer markdown={detail.action_plan_markdown} />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-500">
            No action plan has been published yet.
          </div>
        )}

        {detail.playbook_markdown ? (
          <PlaybookViewer markdown={detail.playbook_markdown} />
        ) : (
          <div className="rounded-2xl border border-slate-200 bg-white/70 p-6 text-sm text-slate-500">
            No marketing playbook is available for this project yet.
          </div>
        )}
      </section>

      <footer className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-slate-200 bg-white/80 p-6 text-sm text-slate-600 sm:flex-row">
        <div>
          <p className="font-semibold text-slate-900">Create your own research vault entry</p>
          <p>
            Run the RealWebWins flow to generate bespoke research, action plans, and playbooks for your next idea.
          </p>
        </div>
        <Button asChild size="sm">
          <Link href="/research">Start new research</Link>
        </Button>
      </footer>
    </main>
  );
}
