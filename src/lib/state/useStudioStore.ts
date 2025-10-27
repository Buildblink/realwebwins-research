import { create } from "zustand";
import type { PainPoint } from "@/types/painpoint";
import type { SessionMessage } from "@/lib/agents/sessions";

export type StudioStage = "idle" | "search" | "running" | "completed" | "error";

interface MVPOutputState {
  id: string;
  title: string | null;
  summary: string | null;
  stack: string | null;
  pricing: string | null;
  risk: string | null;
  validation_score: number | null;
}

interface StudioState {
  stage: StudioStage;
  query: string;
  selectedPain: PainPoint | null;
  transcript: SessionMessage[];
  sessionId: string | null;
  mvpId: string | null;
  output: MVPOutputState | null;
  error: string | null;
  setStage: (stage: StudioStage) => void;
  setQuery: (value: string) => void;
  setPainPoint: (painPoint: PainPoint | null) => void;
  setTranscript: (messages: SessionMessage[]) => void;
  setSession: (sessionId: string | null) => void;
  setOutput: (output: MVPOutputState | null) => void;
  setError: (message: string | null) => void;
  setMvpId: (mvpId: string | null) => void;
  reset: () => void;
}

export const useStudioStore = create<StudioState>((set) => ({
  stage: "search",
  query: "",
  selectedPain: null,
  transcript: [],
  sessionId: null,
  mvpId: null,
  output: null,
  error: null,
  setStage: (stage) => set({ stage }),
  setQuery: (query) => set({ query }),
  setPainPoint: (selectedPain) => set({ selectedPain }),
  setTranscript: (transcript) => set({ transcript }),
  setSession: (sessionId) => set({ sessionId }),
  setOutput: (output) => set({ output }),
  setError: (error) => set({ error }),
  setMvpId: (mvpId) => set({ mvpId }),
  reset: () =>
    set({
      stage: "search",
      transcript: [],
      sessionId: null,
      mvpId: null,
      output: null,
      error: null,
    }),
}));
