export interface ValidationScoreResult {
  score: number;
  reason: string;
}

interface VerdictShape {
  label?: string | null;
  confidence?: string | null;
  score?: number | null;
  sources?: unknown[];
  [key: string]: unknown;
}

export function computeValidationScore(
  verdict: VerdictShape | null | undefined
): ValidationScoreResult {
  if (!verdict) {
    return {
      score: 20,
      reason: "Missing verdict data.",
    };
  }

  let score = 40;
  const reasons: string[] = [];

  if (verdict.label && `${verdict.label}`.toLowerCase() !== "simulation") {
    score += 10;
    reasons.push(`Label: ${verdict.label}`);
  } else {
    reasons.push("Simulation label detected.");
  }

  const confidence = verdict.confidence?.toString().toLowerCase();
  if (confidence === "high") {
    score += 25;
    reasons.push("High confidence verdict.");
  } else if (confidence === "medium") {
    score += 15;
    reasons.push("Medium confidence verdict.");
  } else if (confidence) {
    score += 5;
    reasons.push(`Confidence: ${verdict.confidence}`);
  } else {
    reasons.push("Confidence not provided.");
  }

  if (typeof verdict.score === "number" && !Number.isNaN(verdict.score)) {
    const normalized = Math.max(0, Math.min(100, Math.round(verdict.score * 10)));
    score += Math.round(normalized / 5);
    reasons.push(`Verbal score present (${verdict.score}).`);
  }

  if (Array.isArray(verdict.sources)) {
    const count = verdict.sources.length;
    if (count > 0) {
      score += Math.min(20, count * 5);
      reasons.push(`${count} supporting source(s).`);
    } else {
      reasons.push("No supporting sources provided.");
    }
  }

  const clamped = Math.max(0, Math.min(100, score));

  return {
    score: clamped,
    reason: reasons.join(" "),
  };
}

export default computeValidationScore;
