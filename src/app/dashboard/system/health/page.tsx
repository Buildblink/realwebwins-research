"use client";

import { useEffect, useState } from "react";

interface HealthComponent {
  component: string;
  status: string;
  checked_at: string;
  details: Record<string, unknown> | null;
}

interface AgentEvent {
  id: string;
  agent_id: string;
  type: string;
  payload: Record<string, unknown> | null;
  created_at: string;
}

interface HealthResponse {
  success: boolean;
  data?: {
    uptimePercentage: number;
    errorCount24h: number;
    components: HealthComponent[];
    recentEvents: AgentEvent[];
    lastCheckedAt: string | null;
  };
  error?: string;
  message?: string;
}

function StatusBadge({ status }: { status: string }) {
  const normalized = status.toLowerCase();
  const color =
    normalized === "ok" || normalized === "healthy"
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
      : normalized === "warning"
      ? "bg-amber-500/20 text-amber-300 border-amber-500/30"
      : "bg-rose-500/20 text-rose-300 border-rose-500/30";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${color}`}
    >
      {status}
    </span>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
}

export default function SystemHealthDashboard() {
  const [uptime, setUptime] = useState(100);
  const [errorCount, setErrorCount] = useState(0);
  const [components, setComponents] = useState<HealthComponent[]>([]);
  const [events, setEvents] = useState<AgentEvent[]>([]);
  const [lastChecked, setLastChecked] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const response = await fetch("/api/system/health", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load system health (${response.status})`);
        }
        const json = (await response.json()) as HealthResponse;
        if (!json.success || !json.data) {
          throw new Error(json.message ?? json.error ?? "Unknown error");
        }
        if (mounted) {
          setUptime(json.data.uptimePercentage);
          setErrorCount(json.data.errorCount24h);
          setComponents(json.data.components ?? []);
          setEvents(json.data.recentEvents ?? []);
          setLastChecked(json.data.lastCheckedAt ?? null);
          setError(null);
        }
      } catch (err) {
        console.error("[dashboard.system.health]", err);
        if (mounted) {
          setError(err instanceof Error ? err.message : "Unable to load health data.");
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    load();
    const interval = setInterval(load, 15000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <main className="min-h-screen bg-[#060608] p-6 text-zinc-100">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">System Health</h1>
          <p className="text-sm text-zinc-400">
            Monitor agent events, uptime, and component status to catch regressions early.
          </p>
          <p className="text-xs text-zinc-500">
            Last check: {formatDate(lastChecked)} {isLoading ? "(refreshing…)" : ""}
          </p>
        </header>

        {error && (
          <p className="rounded-md border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">
            {error}
          </p>
        )}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article className="rounded-lg border border-white/10 bg-[#111113] p-4">
            <h2 className="text-xs uppercase tracking-wide text-zinc-500">Uptime</h2>
            <p className="mt-2 text-3xl font-semibold text-emerald-300">
              {uptime.toFixed(2)}%
            </p>
            <p className="text-xs text-zinc-500">
              Percentage of OK health reports across monitored components.
            </p>
          </article>

          <article className="rounded-lg border border-white/10 bg-[#111113] p-4">
            <h2 className="text-xs uppercase tracking-wide text-zinc-500">
              Errors (24h)
            </h2>
            <p className="mt-2 text-3xl font-semibold text-rose-300">{errorCount}</p>
            <p className="text-xs text-zinc-500">
              Agent events flagged with error levels in the last 24 hours.
            </p>
          </article>

          <article className="rounded-lg border border-white/10 bg-[#111113] p-4">
            <h2 className="text-xs uppercase tracking-wide text-zinc-500">
              Components
            </h2>
            <p className="mt-2 text-3xl font-semibold text-indigo-300">
              {components.length}
            </p>
            <p className="text-xs text-zinc-500">
              Individual services reporting their health status.
            </p>
          </article>
        </section>

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Component Status
              </h2>
              <p className="text-xs text-zinc-500">
                Latest capture per component with status badge and metadata.
              </p>
            </div>
            {isLoading && (
              <span className="text-xs uppercase tracking-wide text-zinc-500">
                Refreshing…
              </span>
            )}
          </header>

          {components.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No health reports yet. POST to <code>/api/system/health</code> to seed data.
            </p>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              {components.map((component) => (
                <article
                  key={`${component.component}-${component.checked_at}`}
                  className="rounded-md border border-white/10 bg-[#1b1b1f] p-3 text-sm"
                >
                  <header className="mb-2 flex items-center justify-between">
                    <h3 className="font-semibold text-indigo-200">
                      {component.component}
                    </h3>
                    <StatusBadge status={component.status} />
                  </header>
                  <p className="text-xs text-zinc-500">
                    Checked {formatDate(component.checked_at)}
                  </p>
                  {component.details && Object.keys(component.details).length > 0 ? (
                    <pre className="mt-2 overflow-x-auto rounded-md bg-black/30 p-2 text-xs text-zinc-400">
                      {JSON.stringify(component.details, null, 2)}
                    </pre>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-lg border border-white/10 bg-[#111113] p-4">
          <header className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-zinc-100">
                Recent Agent Events
              </h2>
              <p className="text-xs text-zinc-500">
                Most recent 24h of agent activity with payload excerpts.
              </p>
            </div>
          </header>

          {events.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No agent events recorded in the last 24 hours.
            </p>
          ) : (
            <div className="space-y-3">
              {events.map((event) => (
                <article
                  key={event.id}
                  className="rounded-md border border-white/10 bg-[#1b1b1f] p-3 text-sm"
                >
                  <header className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-zinc-500">
                    <span className="font-medium text-indigo-300">
                      {event.agent_id}
                    </span>
                    <span>{formatDate(event.created_at)}</span>
                  </header>
                  <p className="text-sm text-zinc-200">{event.type}</p>
                  {event.payload && Object.keys(event.payload).length > 0 ? (
                    <pre className="mt-2 overflow-x-auto rounded-md bg-black/30 p-2 text-xs text-zinc-400">
                      {JSON.stringify(event.payload, null, 2)}
                    </pre>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
