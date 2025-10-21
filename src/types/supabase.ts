export interface DatabaseProject {
  id: string;
  user_id: string | null;
  title: string | null;
  idea_description: string | null;
  score: number | null;
  verdict: string | null;
  confidence: string | null;
  research_json: unknown;
  research_report: string | null;
  created_at: string;
  updated_at?: string | null;
  tags?: string[] | null;
  is_public?: boolean;
  is_tracked?: boolean;
  last_refreshed_at?: string | null;
}

export interface AgentStatusEntry {
  id: string;
  idea: string;
  stage: string;
  success: boolean;
  error_log: string | null;
  last_run: string;
  run_type?: "cron" | "cli";
  passed?: boolean;
  summary?: string | null;
}

export interface ActionPlanRecord {
  id: string;
  project_id: string;
  markdown: string | null;
  created_at: string;
}

export interface PlaybookRecord {
  id: string;
  project_id: string;
  markdown: string | null;
  created_at: string;
}

export interface VaultProjectSummary {
  id: string;
  idea_description: string | null;
  tags: string[];
  confidence_score: number | null;
  has_action_plan: boolean;
  has_playbook: boolean;
  created_at: string;
  updated_at: string | null;
  title?: string | null;
  score?: number | null;
  verdict?: string | null;
  is_public?: boolean;
}

export type VaultStage = "research" | "plan" | "playbook";

export interface VaultProjectDetail {
  id: string;
  title: string | null;
  idea_description: string | null;
  research_report: string | null;
  action_plan_markdown: string | null;
  playbook_markdown: string | null;
  tags: string[];
  is_public: boolean;
  stage: VaultStage;
  created_at: string;
  updated_at: string | null;
  verdict: string | null;
  score: number | null;
}

export interface VaultFeedItem {
  id: string;
  title: string | null;
  idea_description: string | null;
  tags: string[];
  confidence: string | null;
  score: number | null;
  verdict: string | null;
  created_at: string;
  updated_at: string | null;
  last_refreshed_at: string | null;
}
