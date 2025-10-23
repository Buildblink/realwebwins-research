import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { CopilotMessage, CopilotOptions } from "@/types/workspace";

// Re-export for backward compatibility
export type { CopilotMessage } from "@/types/workspace";

export type WorkspaceSectionId = "understand" | "ideate" | "build" | "validate";

export interface WorkspacePainPoint {
  id: string;
  text: string;
  audience: string | null;
  category: string | null;
  niche: string | null;
  source: string | null;
  proof_link: string | null;
  related_playbook: string | null;
}

export interface WorkspaceRow {
  id: string;
  pain_point_id: string;
  title: string;
  status: string | null;
  user_id: string | null;
  published_workspace_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceOutputRow {
  id: string;
  workspace_id: string;
  section: WorkspaceSectionId;
  content_md: string | null;
  content_json: unknown;
  model: string | null;
  tokens: number | null;
  cost_usd: string | number | null;
  rating: number | null;
  created_at: string;
  updated_at: string;
}

export interface WorkspaceSnapshot {
  painPoint: WorkspacePainPoint;
  workspace: WorkspaceRow;
  outputs: Record<WorkspaceSectionId, WorkspaceOutputRow | null>;
  sections: Array<{ id: WorkspaceSectionId; label: string; systemGoal: string }>;
}

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export function useWorkspace(painPointId: string | undefined) {
  const [data, setData] = useState<WorkspaceSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchSnapshot = useCallback(async () => {
    if (!painPointId) {
      setData(null);
      return;
    }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/workspace/${painPointId}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });
      if (!response.ok) {
        throw new Error(`Failed to load workspace (${response.status})`);
      }
      const payload = (await response.json()) as ApiResponse<WorkspaceSnapshot>;
      if (!payload.success || !payload.data) {
        throw new Error(payload.message ?? "Workspace request failed.");
      }
      setData(payload.data);
    } catch (err) {
      if ((err as Error).name === "AbortError") {
        return;
      }
      setError((err as Error).message);
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [painPointId]);

  useEffect(() => {
    fetchSnapshot();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchSnapshot]);

  const updateSectionOutput = useCallback((output: WorkspaceOutputRow | null) => {
    if (!output) return;
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        outputs: { ...prev.outputs, [output.section]: output },
      };
    });
  }, []);

  const value = useMemo(
    () => ({
      data,
      isLoading,
      error,
      refresh: fetchSnapshot,
      updateSectionOutput,
    }),
    [data, error, fetchSnapshot, isLoading, updateSectionOutput]
  );

  return value;
}

interface SectionOptions {
  onSuccess?: (output: WorkspaceOutputRow) => void;
}

export function useWorkspaceSection(
  painPointId: string | undefined,
  options?: SectionOptions
) {
  const [activeSection, setActiveSection] = useState<WorkspaceSectionId | null>(null);
  const [error, setError] = useState<string | null>(null);

  const generateSection = useCallback(
    async (section: WorkspaceSectionId) => {
      if (!painPointId) {
        setError("Workspace not ready.");
        return null;
      }
      setActiveSection(section);
      setError(null);
      try {
        const response = await fetch(
          `/api/workspace/${painPointId}?section=${section}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
          }
        );
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Failed to generate section.");
        }
        const payload = (await response.json()) as ApiResponse<{
          output: WorkspaceOutputRow;
          section: WorkspaceSectionId;
        }>;
        if (!payload.success || !payload.data) {
          throw new Error(payload.message ?? "Section request failed.");
        }
        options?.onSuccess?.(payload.data.output);
        return payload.data.output;
      } catch (err) {
        setError((err as Error).message);
        return null;
      } finally {
        setActiveSection(null);
      }
    },
    [options, painPointId]
  );

  return {
    generateSection,
    isGenerating: activeSection !== null,
    activeSection,
    error,
  };
}

// CopilotMessage and CopilotOptions are now imported from @/types/workspace

export function useWorkspaceCopilot(
  painPointId: string | undefined,
  options?: CopilotOptions
) {
  const [history, setHistory] = useState<CopilotMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setAndNotify = useCallback(
    (next: CopilotMessage[]) => {
      setHistory(next);
      options?.onHistoryChange?.(next);
    },
    [options]
  );

  const askQuestion = useCallback(
    async (question: string) => {
      if (!question.trim()) {
        setError("Enter a question first.");
        return null;
      }
      if (!painPointId) {
        setError("Workspace not ready.");
        return null;
      }
      const nextHistory: CopilotMessage[] = [...history, { role: "user", content: question.trim() }];
      setAndNotify(nextHistory);
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(
          `/api/workspace/${painPointId}/ask`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question }),
          }
        );
        if (!response.ok) {
          const message = await response.text();
          throw new Error(message || "Copilot request failed.");
        }
        const payload = (await response.json()) as ApiResponse<{
          answer: string;
          model: string;
        }>;
        if (!payload.success || !payload.data) {
          throw new Error(payload.message ?? "Copilot request failed.");
        }
        const withAssistant = [
          ...nextHistory,
          { role: "assistant", content: payload.data.answer },
        ] as CopilotMessage[];
        setAndNotify(withAssistant);
        return payload.data;
      } catch (err) {
        setError((err as Error).message);
        setAndNotify(history);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [history, painPointId, setAndNotify]
  );

  const reset = useCallback(() => {
    setHistory([]);
    setError(null);
  }, []);

  return {
    history,
    isLoading,
    error,
    askQuestion,
    reset,
  };
}

export type DeliverablesApiResponse = {
  message?: string;
  painPointId?: string;
  snapshot?: WorkspaceSnapshot;
};

export function useDeliverables(painPointId: string | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchDeliverables = useCallback(async () => {
    if (!painPointId) {
      setError("Workspace not ready.");
      return null;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(
        `/api/workspace/${painPointId}/deliverables`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );
      if (!response.ok) {
        const message = await response.text();
        throw new Error(message || "Failed to export deliverables.");
      }
      const payload = (await response.json()) as ApiResponse<DeliverablesApiResponse>;
      if (!payload.success || !payload.data) {
        throw new Error(payload.message ?? "Deliverables request failed.");
      }
      return payload.data;
    } catch (err) {
      setError((err as Error).message);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [painPointId]);

  return {
    fetchDeliverables,
    isLoading,
    error,
  };
}
