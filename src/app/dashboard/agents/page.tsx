"use client";

import { FormEvent, useCallback, useState } from "react";
import useSWR from "swr";
import InsightsList from "@/components/agents/InsightsList";
import { AgentTabs } from "@/components/agents/AgentTabs";

interface ConversationMessage {
  id: string;
  sender_agent: string;
  receiver_agent: string;
  role: string;
  content: string;
  created_at: string;
}

interface ConversationResponse {
  success: boolean;
  messages: ConversationMessage[];
}

const fetcher = async (url: string): Promise<ConversationResponse> => {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load conversation (${response.status})`);
  }
  return response.json();
};

export default function AgentDashboard() {
  const [conversationId, setConversationId] = useState("");
  const [receiverAgent, setReceiverAgent] = useState("agent_alpha");
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStatus, setAnalysisStatus] = useState<string | null>(null);

  const {
    data,
    error,
    isLoading,
    mutate,
  } = useSWR(
    conversationId ? `/api/agents/conversation/${conversationId}` : null,
    fetcher,
    { refreshInterval: 2000 }
  );

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!conversationId || !message.trim()) {
        return;
      }

      setIsSending(true);
      try {
        const response = await fetch("/api/agents/human", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            conversation_id: conversationId,
            receiver_agent: receiverAgent,
            content: message.trim(),
          }),
        });

        if (!response.ok) {
          console.error(
            "[dashboard.agents] Failed to send message",
            await response.text()
          );
        } else {
          setMessage("");
          await mutate();
        }
      } catch (sendError) {
        console.error("[dashboard.agents] Message send failed", sendError);
      } finally {
        setIsSending(false);
      }
    },
    [conversationId, message, receiverAgent, mutate]
  );

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true);
    setAnalysisStatus(null);
    try {
      const response = await fetch("/api/agents/analyze", { method: "POST" });

      if (!response.ok) {
        const text = await response.text();
        console.error("[dashboard.agents] Analyze failed", text);
        setAnalysisStatus("Analysis failed. Check server logs.");
        return;
      }

      const json = await response.json();
      const count = Array.isArray(json.results) ? json.results.length : 0;
      setAnalysisStatus(
        `Analysis complete. Generated ${count} insight${count === 1 ? "" : "s"}.`
      );
    } catch (error) {
      console.error("[dashboard.agents] Analyze crashed", error);
      setAnalysisStatus("Analysis crashed. See console for details.");
    } finally {
      setIsAnalyzing(false);
    }
  }, []);

  return (
    <main className="min-h-screen bg-[#060608] p-6 text-zinc-100">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-4">
        <header>
          <h1 className="text-2xl font-semibold">🤖 Agent Conversations</h1>
          <p className="text-sm text-zinc-400">
            Observe inter-agent threads, inject human prompts, and trigger autonomous research.
          </p>
        </header>

        <AgentTabs />

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <header className="mb-3">
            <h2 className="text-lg font-semibold text-zinc-100">Autonomous Research Mode</h2>
            <p className="text-sm text-zinc-400">
              Launch the research agent to analyze recent records and record insights in Supabase.
            </p>
          </header>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              type="button"
              onClick={handleAnalyze}
              className="inline-flex items-center justify-center rounded-md bg-emerald-500 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isAnalyzing}
            >
              {isAnalyzing ? "Analyzing…" : "Run Analysis"}
            </button>
            {analysisStatus && (
              <p className="text-sm text-zinc-300">{analysisStatus}</p>
            )}
          </div>
        </section>

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <form className="flex flex-col gap-3" onSubmit={handleSubmit}>
            <label className="text-sm font-medium text-zinc-300">
              Conversation ID
              <input
                className="mt-1 w-full rounded-md border border-white/10 bg-[#1b1b1f] p-2 text-sm text-zinc-100"
                placeholder="00000000-0000-0000-0000-000000000000"
                value={conversationId}
                onChange={(event) => setConversationId(event.target.value)}
              />
            </label>

            <label className="text-sm font-medium text-zinc-300">
              Target Agent
              <input
                className="mt-1 w-full rounded-md border border-white/10 bg-[#1b1b1f] p-2 text-sm text-zinc-100"
                placeholder="agent_alpha"
                value={receiverAgent}
                onChange={(event) => setReceiverAgent(event.target.value)}
              />
            </label>

            <label className="text-sm font-medium text-zinc-300">
              Message
              <textarea
                className="mt-1 h-24 w-full rounded-md border border-white/10 bg-[#1b1b1f] p-2 text-sm text-zinc-100"
                placeholder="Share context for the agents…"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
              />
            </label>

            <button
              type="submit"
              className="inline-flex items-center justify-center rounded-md bg-indigo-500 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
              disabled={isSending || !conversationId || !message.trim()}
            >
              {isSending ? "Sending…" : "Send to agents"}
            </button>
          </form>
        </section>

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <header className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Thread</h2>
            {isLoading && <span className="text-xs text-zinc-500">Loading…</span>}
          </header>

          <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-2">
            {error && (
              <p className="text-sm text-red-400">
                Failed to load conversation: {error.message}
              </p>
            )}
            {!error && data?.messages?.length === 0 && (
              <p className="text-sm text-zinc-500">
                No messages yet. Kick off the conversation above.
              </p>
            )}
            {data?.messages?.map((entry) => (
              <article
                key={entry.id}
                className="rounded-md border border-white/5 bg-[#1b1b1f] p-3 text-sm"
              >
                <header className="mb-1 flex items-center justify-between text-xs text-zinc-400">
                  <span className="font-semibold text-indigo-300">
                    {entry.sender_agent}
                  </span>
                  <time suppressHydrationWarning dateTime={entry.created_at}>
                    {new Date(entry.created_at).toLocaleTimeString()}
                  </time>
                </header>
                <p className="whitespace-pre-wrap text-zinc-100">
                  {entry.content}
                </p>
                <footer className="mt-2 flex items-center justify-between text-xs text-zinc-500">
                  <span>→ {entry.receiver_agent}</span>
                  <span>{entry.role}</span>
                </footer>
              </article>
            ))}
          </div>
        </section>

        <InsightsList />
      </div>
    </main>
  );
}
