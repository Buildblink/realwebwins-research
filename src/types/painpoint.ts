// Pain point categories
export type PainPointCategory =
  | "Marketing"
  | "Monetization"
  | "Motivation"
  | "Product"
  | "Growth"
  | "Pricing"
  | "Technical";

// Pain point niches/audiences
export type PainPointNiche =
  | "YouTubers"
  | "Etsy Sellers"
  | "Indie Hackers"
  | "Freelancers"
  | "Solopreneurs"
  | "Content Creators"
  | "SaaS Founders"
  | "E-commerce";

// Pain point sources
export type PainPointSource = "Reddit" | "IndieHackers" | "X" | "Manual";

// Pain point audience types
export type PainPointAudience = "creator" | "consumer";

// Main pain point interface matching database schema
export interface PainPoint {
  id: string;
  text: string;
  summary?: string | null;
  category: string | null;
  niche: string | null;
  source: string | null;
  audience: string | null;
  frequency: number | null;
  proof_link: string | null;
  proof_links?: string[] | null;
  popularity_score?: number | null;
  related_case_id: string | null;
  related_playbook: string | null;
  last_seen: string | null;
  created_at: string;
}

// Filters for querying pain points
export interface PainPointFilters {
  search?: string;
  category?: string;
  niche?: string;
  source?: string;
  audience?: string;
  hasPlaybook?: boolean;
  page?: number;
  pageSize?: number;
  sort?: "popularity" | "recent";
}

// API response structure with pagination
export interface PainPointResponse {
  data: PainPoint[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// Seed data structure for CSV/JSON import
export interface PainPointSeed {
  text: string;
  summary?: string;
  category: string;
  niche: string;
  source: string;
  audience?: string;
  frequency: number;
  proof_link?: string;
  proof_links?: string[];
  popularity_score?: number;
  related_playbook?: string;
}
