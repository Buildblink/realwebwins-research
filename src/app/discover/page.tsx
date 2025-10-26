import { AppShell } from "@/components/layout/AppShell";
import { DiscoverClient } from "@/app/discover/discover-client";
import { queryPainPoints } from "@/lib/painpoints/queryPainPoints";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const { data } = await queryPainPoints({ pageSize: 12, page: 1 });

  return (
    <AppShell>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Top Pain Points</h2>
        <p className="text-sm text-zinc-400">
          Browse patterns sourced from founders, creators, and operators. Launch the studio to craft an MVP instantly.
        </p>
      </section>
      <DiscoverClient initialPainPoints={data} />
    </AppShell>
  );
}
