import { notFound } from "next/navigation";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import ProjectDetailPageView from "@/components/ProjectDetailPage";
import type {
  ActionPlanRecord,
  DatabaseProject,
  PlaybookRecord,
} from "@/types/supabase";

interface ProjectPageProps {
  params: Promise<{
    id: string;
  }>;
}

async function fetchProject(id: string): Promise<
  (DatabaseProject & Record<string, unknown>) | null
> {
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

async function fetchExistingActionPlan(
  projectId: string
): Promise<Pick<ActionPlanRecord, "markdown" | "created_at"> | null> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("ActionPlans")
      .select("markdown, created_at")
      .eq("project_id", projectId)
      .maybeSingle();

    if (error) {
      if (error.code !== "PGRST116") {
        console.warn("[ProjectDetail] Failed to load existing action plan", error);
      }
      return null;
    }

    return data;
  } catch (error) {
    console.warn("[ProjectDetail] unexpected action plan fetch error", error);
    return null;
  }
}

async function fetchExistingPlaybook(
  projectId: string
): Promise<Pick<PlaybookRecord, "markdown" | "created_at"> | null> {
  try {
    const supabase = getSupabaseAdminClient();
    const { data, error } = await supabase
      .from("Playbooks")
      .select("markdown, created_at")
      .eq("project_id", projectId)
      .maybeSingle();

    if (error) {
      if (error.code !== "PGRST116") {
        console.warn("[ProjectDetail] Failed to load existing playbook", error);
      }
      return null;
    }

    return data;
  } catch (error) {
    console.warn("[ProjectDetail] unexpected playbook fetch error", error);
    return null;
  }
}

export default async function ProjectPage({ params }: ProjectPageProps) {
  try {
    const { id } = await params;
    const projectData = await fetchProject(id);
    if (!projectData) {
      return notFound();
    }
    const [actionPlan, playbook] = await Promise.all([
      fetchExistingActionPlan(id),
      fetchExistingPlaybook(id),
    ]);

    return (
      <ProjectDetailPageView
        project={projectData}
        actionPlan={actionPlan}
        playbook={playbook}
        showPublishingControls={Boolean(process.env.ADMIN_MODE)}
      />
    );
  } catch (error) {
    console.error("[project.detail] error", error);
    return (
      <ProjectDetailPageView
        project={null}
        actionPlan={null}
        playbook={null}
        errorMessage="Unable to load this project. It might have been deleted or you may not have access."
        showPublishingControls={Boolean(process.env.ADMIN_MODE)}
      />
    );
  }
}
