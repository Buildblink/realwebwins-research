import Link from "next/link";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { ResearchCard } from "@/components/ResearchCard";
import type { DatabaseProject } from "@/types/supabase";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

async function getProjects(): Promise<DatabaseProject[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("research_projects")
    .select(
      "id, user_id, title, idea_description, score, verdict, confidence, created_at, research_report, research_json"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    throw new Error(error.message);
  }

  return data as DatabaseProject[];
}

export default async function DashboardPage() {
  let projects: DatabaseProject[] = [];
  let errorMessage: string | null = null;

  try {
    projects = await getProjects();
  } catch (error) {
    errorMessage =
      error instanceof Error ? error.message : "Unable to load projects.";
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-heading text-3xl text-slate-900">
            Research Vault
          </h2>
          <p className="text-sm text-slate-500">
            Every Claude run is archived with markdown, verdict, and raw JSON
            for deeper analysis.
          </p>
        </div>
        <Button asChild>
          <Link href="/">+ New Research</Link>
        </Button>
      </div>

      {errorMessage ? (
        <div className="rounded-xl border border-danger/40 bg-danger/10 p-6 text-danger">
          <p className="font-semibold">Could not load projects</p>
          <p className="text-sm text-danger/80">{errorMessage}</p>
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-foreground/20 bg-white/60 p-10 text-center text-sm text-slate-500">
          You have no research runs yet. Generate one from the home page to
          populate your vault.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((project, index) => (
            <ResearchCard key={project.id} project={project} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
