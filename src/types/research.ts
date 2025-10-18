export type ResearchVerdictLabel =
  | "strong_go"
  | "go"
  | "neutral"
  | "risky"
  | "no_go";

export interface ResearchVerdict {
  score: number;
  label: ResearchVerdictLabel;
  confidence: "low" | "medium" | "high";
  summary?: string;
}

export interface MarketSize {
  tam: string;
  growth: string;
}

export interface CompetitorInsight {
  name: string;
  price?: string;
  differentiator?: string;
}

export interface TrendInsight {
  keyword: string;
  trend: string;
  notes?: string;
}

export interface MonetizationInsight {
  model: string;
  price_suggestion?: string;
  channels?: string[];
}

export interface BuildComplexityInsight {
  difficulty: number;
  weeks: number;
  stack?: string[];
}

export interface ResearchGeneratedData {
  verdict: ResearchVerdict;
  market_size: MarketSize;
  competition: CompetitorInsight[];
  pain_points: string[];
  trends: TrendInsight;
  monetization: MonetizationInsight;
  build_complexity: BuildComplexityInsight;
  go_to_market?: string[];
}

export interface ResearchProjectPayload extends ResearchGeneratedData {
  ideaDescription: string;
  projectId: string;
  createdAt: string;
}
