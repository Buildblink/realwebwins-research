import { Suspense } from "react";
import { Loader2 } from "lucide-react";
import { PainPointList } from "@/components/painpoints/PainPointList";
import {
  getPainPointCategories,
  getPainPointNiches,
  getPainPointSources,
  getPainPointAudiences,
} from "@/lib/painpoints/queryPainPoints";

export const dynamic = "force-dynamic";

export default async function PainPointsPage() {
  // Fetch filter options from database
  const [categories, niches, sources, audiences] = await Promise.all([
    getPainPointCategories(),
    getPainPointNiches(),
    getPainPointSources(),
    getPainPointAudiences(),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-12">
      {/* Header */}
      <section className="space-y-3">
        <h1 className="font-heading text-4xl font-bold tracking-tight text-slate-900">
          Pain Point Explorer
        </h1>
        <p className="text-lg text-slate-600">
          Browse struggles creators face and problems consumers want solved — linked to
          actionable playbooks and proven solutions.
        </p>
      </section>

      {/* Pain Points List */}
      <Suspense
        fallback={
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        }
      >
        <PainPointList
          categories={categories}
          niches={niches}
          sources={sources}
          audiences={audiences}
        />
      </Suspense>
    </main>
  );
}
