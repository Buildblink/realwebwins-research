import { Badge } from "@/components/ui/badge";
import { normalizeTier, type TierLevel } from "@/middleware/tierGate";

const COLORS: Record<TierLevel, string> = {
  free: "bg-gray-800 text-gray-100 border-gray-700",
  pro: "bg-indigo-600/20 text-indigo-200 border-indigo-500/60",
  premium: "bg-amber-500/20 text-amber-200 border-amber-400/70",
};

interface TierBadgeProps {
  tier?: string | null;
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  const normalized = normalizeTier(tier);
  return (
    <Badge
      data-tier={normalized}
      className={`${COLORS[normalized]} uppercase tracking-wide text-[11px] font-semibold ${className ?? ""}`}
    >
      {normalized}
    </Badge>
  );
}
