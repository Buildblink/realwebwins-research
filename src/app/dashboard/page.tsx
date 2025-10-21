import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import type { DatabaseProject } from "@/types/supabase";
import { Dashboard } from "@/components/Dashboard";

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

  return <Dashboard projects={projects} errorMessage={errorMessage} />;
}
