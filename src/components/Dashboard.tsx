import Link from "next/link";
import { ResearchCard } from "@/components/ResearchCard";
import { Button } from "@/components/ui/button";
import { DashboardAnalytics } from "@/components/dashboard/DashboardAnalytics";
import type { DatabaseProject } from "@/types/supabase";

interface DashboardProps {
  projects: DatabaseProject[];
  errorMessage?: string | null;
  userId?: string;
}

export function Dashboard({ projects, errorMessage, userId }: DashboardProps) {
  return (
    <div className="space-y-12">
      {/* Analytics Section */}
      <DashboardAnalytics userId={userId} />

      {/* Divider */}
      <div className="border-t border-slate-200" />

      {/* Research Vault Section */}
      <div className="space-y-8">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-heading text-3xl text-slate-900">Research Vault</h2>
            <p className="text-sm text-slate-500">
              Every Claude run is archived with markdown, verdict, and raw JSON for deeper analysis.
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
          You have no research runs yet. Generate one from the home page to populate your vault.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {projects.map((project, index) => (
            <ResearchCard key={project.id} project={project} index={index} />
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
