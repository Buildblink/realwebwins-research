export interface VaultStats {
  total: number;
  withPlan: number;
  withPlaybook: number;
  avgConfidence: number;
  conversionRate: number;
}

export function calculateVaultStats(projects: Array<{ has_action_plan?: boolean; has_playbook?: boolean; confidence_score?: number | null }>): VaultStats {
  const total = projects.length;
  const withPlan = projects.filter((p) => Boolean(p.has_action_plan)).length;
  const withPlaybook = projects.filter((p) => Boolean(p.has_playbook)).length;
  const sumConfidence = projects.reduce(
    (acc, p) => acc + (typeof p.confidence_score === "number" ? p.confidence_score : 0),
    0
  );
  const avgConfidence = Math.round(sumConfidence / (total || 1));
  const conversionRate = total === 0 ? 0 : Math.round((withPlaybook / total) * 100);

  return {
    total,
    withPlan,
    withPlaybook,
    avgConfidence,
    conversionRate,
  };
}
