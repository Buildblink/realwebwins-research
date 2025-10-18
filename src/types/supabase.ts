export interface DatabaseProject {
  id: string;
  user_id: string | null;
  title: string;
  idea_description: string;
  score: number | null;
  verdict: string | null;
  confidence: string | null;
  research_json: unknown;
  research_report: string | null;
  created_at: string;
}
