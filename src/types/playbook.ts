// Tool recommendation interface
export interface PlaybookTool {
  name: string;
  link?: string;
  icon?: string;
  description?: string;
}

// Affiliate link interface
export interface AffiliateLink {
  name: string;
  url: string;
  description?: string;
  price?: string;
}

// Main playbook interface matching database schema
export interface Playbook {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  category: string | null;
  niche: string | null;
  related_pain_id: string | null;
  related_case_id: string | null;
  tools: PlaybookTool[];
  affiliate_links: AffiliateLink[];
  created_at: string;
}

// Playbook with related data
export interface PlaybookWithRelated extends Playbook {
  related_pain?: {
    id: string;
    text: string;
    category: string | null;
    niche: string | null;
  } | null;
  related_case?: {
    id: string;
    title: string | null;
    idea_description: string | null;
    score: number | null;
  } | null;
}

// Filters for querying playbooks
export interface PlaybookFilters {
  category?: string;
  niche?: string;
  page?: number;
  pageSize?: number;
}

// API response structure with pagination
export interface PlaybookResponse {
  data: Playbook[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Seed data structure for CSV import
export interface PlaybookSeed {
  title: string;
  slug: string;
  description: string;
  content: string;
  category: string;
  niche: string;
  related_pain_id?: string;
  related_case_id?: string;
  tools: string; // JSON string
  affiliate_links: string; // JSON string;
}
