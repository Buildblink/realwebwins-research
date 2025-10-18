import Link from 'next/link';
import { ReportActions } from '@/components/ReportActions';
import { supabase, isSupabaseStub } from '@/lib/supabaseClient';

type ResearchReport = {
  id: string;
  ideaDescription: string;
  summary: string;
  nextSteps: string;
  confidence: number;
  created_at: string;
};

const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));

const formatConfidence = (value: number) =>
  `${Math.round(Math.min(Math.max(value, 0), 1) * 100)}%`;

const parseSteps = (value: string) => {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String) : [String(value)];
  } catch {
    return value.split('\n').filter(Boolean);
  }
};

export default async function DashboardPage() {
  const { data, error } = await supabase
    .from('research_reports')
    .select('id, ideaDescription, summary, nextSteps, confidence, created_at')
    .order('created_at', { ascending: false });

  const reports = (data ?? []) as ResearchReport[];

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-white">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-6 py-12">
        <NavBar />

        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold text-slate-900">Research Dashboard</h1>
          <p className="text-sm text-slate-600">
            Review recently generated research reports and monitor confidence at a glance.
          </p>
        </header>

        {isSupabaseStub && (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 shadow-sm">
            Using local storage stub. Set real Supabase credentials in
            <code className="mx-1 rounded bg-amber-100 px-1 py-px text-xs">.env.local</code>
            to sync data across environments.
          </section>
        )}

        {error ? (
          <section className="rounded-2xl border border-red-200 bg-red-50 p-6 text-red-700 shadow">
            <h2 className="text-lg font-semibold">Unable to load reports</h2>
            <p className="mt-2 text-sm">
              Check your Supabase credentials and ensure the <code>research_reports</code> table exists.
            </p>
          </section>
        ) : reports.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow">
            <h2 className="text-xl font-semibold text-slate-800">No research reports yet</h2>
            <p className="mt-2 text-sm text-slate-600">
              Generate your first insight on the{' '}
              <Link href="/research" className="text-indigo-600 underline">
                Research page
              </Link>
              .
            </p>
          </section>
        ) : (
          <section className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {reports.map((report) => (
              <article
                key={report.id}
                className="group flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-lg"
              >
                <div className="flex flex-col gap-3">
                  <div className="flex items-start justify-between gap-4">
                    <h2 className="line-clamp-2 text-lg font-semibold text-slate-900">
                      {report.ideaDescription}
                    </h2>
                    <span className="flex-shrink-0 rounded-full bg-indigo-100 px-3 py-1 text-xs font-semibold text-indigo-700">
                      {formatConfidence(report.confidence)}
                    </span>
                  </div>
                  <p className="text-xs uppercase tracking-wide text-slate-500">
                    {formatDate(report.created_at)}
                  </p>
                </div>
                <div className="mt-6 flex flex-col gap-3 text-sm">
                  <Link href="#" className="text-indigo-600 transition group-hover:text-indigo-700">
                    {'View details ->'}
                  </Link>
                  <ReportActions
                    report={{
                      id: report.id,
                      ideaDescription: report.ideaDescription,
                      summary: report.summary,
                      nextSteps: parseSteps(report.nextSteps),
                      confidence: report.confidence,
                      generatedAt: report.created_at,
                    }}
                  />
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

function NavBar() {
  return (
    <nav className="flex items-center justify-between rounded-full border border-slate-200 bg-white/80 px-6 py-3 shadow-sm backdrop-blur">
      <Link href="/" className="text-sm font-semibold text-slate-900">
        Real Web Wins
      </Link>
      <div className="flex items-center gap-3 text-sm font-medium text-slate-600">
        <Link
          href="/research"
          className="rounded-full px-3 py-1 transition hover:bg-indigo-50 hover:text-indigo-700"
        >
          Research
        </Link>
        <Link
          href="/dashboard"
          className="rounded-full bg-indigo-600 px-3 py-1 text-white shadow transition hover:bg-indigo-700"
        >
          Dashboard
        </Link>
      </div>
    </nav>
  );
}
