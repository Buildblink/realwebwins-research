import { compareDesc, isAfter, parseISO, subDays } from "date-fns";
import type { VaultFeedItem } from "@/types/supabase";

export interface VaultFeedSections {
  topNew: VaultFeedItem[];
  mostRefreshed: VaultFeedItem[];
}

function parseTimestamp(value: string | null | undefined): Date | null {
  if (!value) return null;
  try {
    return parseISO(value);
  } catch {
    return null;
  }
}

export function buildVaultFeedSections(
  items: VaultFeedItem[],
  now: Date = new Date()
): VaultFeedSections {
  if (items.length === 0) {
    return { topNew: [], mostRefreshed: [] };
  }

  const weekAgo = subDays(now, 7);

  const itemsByCreated = [...items].sort((a, b) => {
    const first = parseTimestamp(a.created_at) ?? new Date(0);
    const second = parseTimestamp(b.created_at) ?? new Date(0);
    return compareDesc(first, second);
  });

  const recentWithinWeek = itemsByCreated.filter((item) => {
    const createdAt = parseTimestamp(item.created_at);
    return createdAt ? isAfter(createdAt, weekAgo) : false;
  });

  const topNew: VaultFeedItem[] = recentWithinWeek.slice(0, 5);

  if (topNew.length < 5) {
    for (const candidate of itemsByCreated) {
      if (topNew.length >= 5) {
        break;
      }
      if (topNew.some((entry) => entry.id === candidate.id)) {
        continue;
      }
      topNew.push(candidate);
    }
  }

  const itemsByRefresh = [...items].sort((a, b) => {
    const first =
      parseTimestamp(a.last_refreshed_at) ??
      parseTimestamp(a.updated_at) ??
      parseTimestamp(a.created_at) ??
      new Date(0);
    const second =
      parseTimestamp(b.last_refreshed_at) ??
      parseTimestamp(b.updated_at) ??
      parseTimestamp(b.created_at) ??
      new Date(0);
    return compareDesc(first, second);
  });

  const mostRefreshed: VaultFeedItem[] = [];

  for (const candidate of itemsByRefresh) {
    if (mostRefreshed.length >= 5) {
      break;
    }

    const refreshedAt =
      parseTimestamp(candidate.last_refreshed_at) ??
      parseTimestamp(candidate.updated_at);

    if (!refreshedAt) {
      continue;
    }

    mostRefreshed.push(candidate);
  }

  if (mostRefreshed.length < 5) {
    for (const candidate of itemsByRefresh) {
      if (mostRefreshed.length >= 5) {
        break;
      }
      if (mostRefreshed.some((entry) => entry.id === candidate.id)) {
        continue;
      }
      mostRefreshed.push(candidate);
    }
  }

  return {
    topNew,
    mostRefreshed,
  };
}
