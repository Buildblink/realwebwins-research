'use client';

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { CopilotMessage } from "@/hooks/useWorkspace";
import { cn } from "@/lib/utils";

interface CopilotInputProps {
  history: CopilotMessage[];
  isLoading: boolean;
  error?: string | null;
  onSubmit: (question: string) => Promise<void>;
  onReset?: () => void;
}

export function CopilotInput({
  history,
  isLoading,
  error,
  onSubmit,
  onReset,
}: CopilotInputProps) {
  const [question, setQuestion] = useState("");

  const handleSubmit = async () => {
    if (!question.trim() || isLoading) return;
    await onSubmit(question.trim());
    setQuestion("");
  };

  return (
    <div className="flex h-full flex-col rounded-2xl border border-white/5 bg-[#111113]/80 p-4">
      <header className="flex items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[#22d3ee]">
            Copilot
          </h3>
          <p className="text-xs text-zinc-500">
            Ask for research shortcuts, validation plays, or guardrails.
          </p>
        </div>
        {history.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="text-xs text-zinc-400 hover:text-zinc-100"
          >
            Clear
          </Button>
        )}
      </header>

      <div className="mt-4 flex-1 overflow-y-auto rounded-xl border border-white/5 bg-[#0e0e10]/80 p-4 text-sm">
        {history.length === 0 && !isLoading && (
          <p className="text-zinc-500">
            Ask something like {"\"What's the fastest way to validate this MVP?\""} or{" "}
            {"\"Which metrics should I watch post-launch?\""}
          </p>
        )}
        <div className="flex flex-col gap-3">
          {history.map((message, index) => (
            <div
              key={`${message.role}-${index}`}
              className={cn(
                "rounded-lg px-3 py-2",
                message.role === "user"
                  ? "self-end bg-[#4f46e5]/40 text-zinc-50"
                  : "self-start bg-[#18181b] text-zinc-200"
              )}
            >
              {message.content}
            </div>
          ))}
          {isLoading && (
            <div className="self-start rounded-lg bg-[#18181b] px-3 py-2 text-zinc-500">
              Thinking...
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2">
        <Textarea
          rows={3}
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="Ask how to test pricing, pick a stack, or de-risk the launch."
          className="resize-none border-[#1f1f23] bg-[#0e0e10] text-sm text-zinc-200 placeholder:text-zinc-600"
        />
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <Button
          onClick={handleSubmit}
          disabled={isLoading || !question.trim()}
          className="bg-gradient-to-r from-[#4f46e5] to-[#22d3ee] text-black hover:opacity-90"
        >
          {isLoading ? "Routing..." : "Ask Copilot"}
        </Button>
      </div>
    </div>
  );
}

