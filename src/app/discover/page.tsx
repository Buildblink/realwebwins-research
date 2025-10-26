import { AppShell } from "@/components/layout/AppShell";
import { DiscoverClient } from "@/app/discover/discover-client";
import {
  getPainPointCategories,
  queryPainPoints,
} from "@/lib/painpoints/queryPainPoints";

export const dynamic = "force-dynamic";

export default async function DiscoverPage() {
  const [{ data }, categories] = await Promise.all([
    queryPainPoints({ pageSize: 12, page: 1, sort: "popularity" }),
    getPainPointCategories(),
  ]);
  const trending = (await queryPainPoints({ pageSize: 6, page: 1, sort: "popularity" })).data;

  return (
    <AppShell>
      <section className="space-y-3">
        <h2 className="text-xl font-semibold text-white">Top Pain Points</h2>
        <p className="text-sm text-zinc-400">
          Browse patterns sourced from founders, creators, and operators. Launch the studio to craft an MVP instantly.
        </p>
      </section>
      <DiscoverClient
        initialPainPoints={data}
        categories={["All", ...categories]}
        trending={trending}
      />
    </AppShell>
  );
}
