import type { ResearchVerdictLabel } from "@/types/research";

export function verdictToVariant(label: ResearchVerdictLabel | string) {
  switch (label) {
    case "strong_go":
    case "go":
      return "success";
    case "neutral":
      return "neutral";
    case "risky":
      return "warning";
    case "no_go":
      return "danger";
    default:
      return "neutral";
  }
}
