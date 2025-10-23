import { useCallback, useEffect, useState } from "react";

export interface Profile {
  id: string;
  user_id: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  links: Array<{ label: string; url: string }>;
  created_at: string;
  updated_at: string;
}

interface PublicWorkspace {
  id: string;
  workspace_id: string;
  title: string;
  description: string;
  category: string;
  niche: string;
  views: number;
  remix_count: number;
  published: boolean;
  created_at: string;
  workspaces?: {
    user_id: string;
    pain_point_id: string;
    pain_points?: {
      text: string;
      category: string;
      niche: string;
    };
  };
  [key: string]: unknown;
}

interface UseProfileOptions {
  userId?: string;
  enabled?: boolean;
}

/**
 * Hook for fetching and managing user profiles
 */
export function useProfile(options?: UseProfileOptions) {
  const { userId, enabled = true } = options ?? {};

  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!userId || !enabled) {
      setProfile(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/profile?userId=${userId}`);

      if (!response.ok) {
        throw new Error(`Failed to fetch profile (${response.status})`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message ?? "Profile fetch failed");
      }

      setProfile(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setProfile(null);
      console.error("[useProfile] Failed to fetch profile", err);
    } finally {
      setIsLoading(false);
    }
  }, [userId, enabled]);

  const saveProfile = useCallback(
    async (data: {
      username: string;
      bio?: string;
      avatar_url?: string;
      links?: Array<{ label: string; url: string }>;
    }) => {
      if (!userId) {
        throw new Error("User ID is required to save profile");
      }

      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            ...data,
          }),
        });

        if (!response.ok) {
          const result = await response.json();
          throw new Error(result.message ?? `Failed to save profile (${response.status})`);
        }

        const result = await response.json();

        if (!result.success || !result.data) {
          throw new Error(result.message ?? "Profile save failed");
        }

        setProfile(result.data);
        return result.data;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unknown error";
        setError(message);
        console.error("[useProfile] Failed to save profile", err);
        throw err;
      } finally {
        setIsLoading(false);
      }
    },
    [userId]
  );

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    isLoading,
    error,
    saveProfile,
    refresh: fetchProfile,
  };
}

/**
 * Hook for fetching public profile by username
 */
export function usePublicProfile(username: string | undefined) {
  const [data, setData] = useState<{
    profile: Profile;
    workspaces: PublicWorkspace[];
    stats: {
      total_published: number;
      total_views: number;
      total_remixes: number;
    };
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchPublicProfile = useCallback(async () => {
    if (!username) {
      setData(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/profile/${username}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("Profile not found");
        }
        throw new Error(`Failed to fetch profile (${response.status})`);
      }

      const result = await response.json();

      if (!result.success || !result.data) {
        throw new Error(result.message ?? "Profile fetch failed");
      }

      setData(result.data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      setData(null);
      console.error("[usePublicProfile] Failed to fetch profile", err);
    } finally {
      setIsLoading(false);
    }
  }, [username]);

  useEffect(() => {
    fetchPublicProfile();
  }, [fetchPublicProfile]);

  return {
    data,
    isLoading,
    error,
    refresh: fetchPublicProfile,
  };
}
