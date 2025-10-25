"use client";

import useSWR from "swr";

interface AgentInsight {
  id: string;
  agent_id: string;
  source_table: string;
  source_id: string | null;
  insight_type: string | null;
  summary: string | null;
  confidence: number | null;
  created_at: string;
  meta?: Record<string, unknown>;
}

interface InsightsResponse {
  success: boolean;
  data: AgentInsight[];
}

const fetcher = async (url: string): Promise<InsightsResponse> => {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Failed to load insights (${response.status})`);
  }
  return response.json();
};

export default function InsightsList() {
  const { data, error, isLoading, mutate } = useSWR(
    "/api/agents/insights",
    fetcher,
    { refreshInterval: 5000 }
  );

  const insights = data?.data ?? [];

  return (
    <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
      <header className="mb-3 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Autonomous Insights
          </h2>
          <p className="text-xs text-zinc-500">
            Latest findings captured in <code>agent_insights</code>.
          </p>
        </div>
        <button
          onClick={() => mutate()}
          className="text-xs font-medium text-indigo-300 hover:text-indigo-200"
          type="button"
        >
          Refresh
        </button>
      </header>

      {error && (
        <p className="text-sm text-red-400">
          Failed to load insights: {error.message}
        </p>
      )}

      {isLoading && insights.length === 0 && (
        <p className="text-sm text-zinc-500">Loading insights…</p>
      )}

      {insights.length === 0 && !isLoading && !error && (
        <p className="text-sm text-zinc-500">
          Run an analysis to generate fresh insights.
        </p>
      )}

      <div className="space-y-3">
        {insights.map((insight) => (
          <article
            key={insight.id}
            className="rounded-md border border-white/5 bg-[#1b1b1f] p-3 text-sm text-zinc-100"
          >
            <header className="mb-2 flex items-center justify-between text-xs text-zinc-500">
              <span>
                {insight.agent_id} → {insight.source_table}
                {insight.source_id ? `#${String(insight.source_id).slice(0, 8)}` : ""}
              </span>
              <time suppressHydrationWarning dateTime={insight.created_at}>
                {new Date(insight.created_at).toLocaleTimeString()}
              </time>
            </header>
            <pre className="whitespace-pre-wrap text-sm text-zinc-100">
              {insight.summary ?? "(no summary)"}
            </pre>
            <footer className="mt-2 flex items-center justify-between text-xs text-zinc-500">
              <span>{insight.insight_type ?? "insight"}</span>
              <span>
                Confidence:{" "}
                {typeof insight.confidence === "number"
                  ? insight.confidence.toFixed(2)
                  : "n/a"}
              </span>
            </footer>
          </article>
        ))}
      </div>
    </section>
  );
}
