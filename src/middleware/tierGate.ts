const tierLevels = ["free", "pro", "premium"] as const;

export type TierLevel = (typeof tierLevels)[number];

export function normalizeTier(value: string | null | undefined): TierLevel {
  const normalized = (value ?? "").toLowerCase();
  if (tierLevels.includes(normalized as TierLevel)) {
    return normalized as TierLevel;
  }
  return "free";
}

export function assertTierAccess(
  userTier: string | null | undefined,
  required: string | null | undefined
): void {
  const userLevel = normalizeTier(userTier);
  const requiredLevel = normalizeTier(required);
  if (tierLevels.indexOf(userLevel) < tierLevels.indexOf(requiredLevel)) {
    throw new Error("TIER_UPGRADE_REQUIRED");
  }
}

export function canAccessTier(
  userTier: string | null | undefined,
  required: string | null | undefined
): boolean {
  try {
    assertTierAccess(userTier, required);
    return true;
  } catch {
    return false;
  }
}
