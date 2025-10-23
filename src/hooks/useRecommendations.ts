import { useCallback, useEffect, useState } from "react";

export interface WorkspaceRecommendation {
  id: string;
  pain_point_id: string;
  title: string;
  pain_point_text: string;
  category: string | null;
  niche: string | null;
  audience: string | null;
  relevance_score: number;
}

interface RecommendationsResponse {
  workspace_id: string;
  recommendations: WorkspaceRecommendation[];
  count: number;
}

interface UseRecommendationsOptions {
  userId?: string;
  limit?: number;
  enabled?: boolean; // Allow conditional fetching
}

/**
 * Hook for fetching workspace recommendations
 * @param workspaceId Current workspace ID
 * @param options Optional configuration
 */
export function useRecommendations(
  workspaceId: string | undefined,
  options?: UseRecommendationsOptions
) {
  const { userId, limit = 5, enabled = true } = options ?? {};

  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchRecommendations = useCallback(async () => {
    if (!workspaceId || !enabled) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        workspaceId,
        limit: limit.toString(),
      });

      if (userId) {
        params.append("userId", userId);
      }

      const response = await fetch(`/api/recommendations?${params.toString()}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations (${response.status})`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.message ?? "Recommendations request failed.");
      }

      setData(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setData(null);
      console.warn("[useRecommendations] Failed to fetch", err);
    } finally {
      setIsLoading(false);
    }
  }, [workspaceId, userId, limit, enabled]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    fetchRecommendations();
  }, [fetchRecommendations]);

  return {
    data,
    recommendations: data?.recommendations ?? [],
    count: data?.count ?? 0,
    isLoading,
    error,
    refresh: fetchRecommendations,
  };
}
