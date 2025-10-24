import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, BookOpen, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPainPointById } from "@/lib/painpoints/queryPainPoints";
import { fetchVaultProjectDetail } from "@/lib/vaultData";
import { PainPointDetailTracker } from "@/components/painpoints/PainPointDetailTracker";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  Marketing: "bg-blue-500/20 text-blue-400 border-blue-500/40",
  Monetization: "bg-green-500/20 text-green-400 border-green-500/40",
  Motivation: "bg-purple-500/20 text-purple-400 border-purple-500/40",
  Product: "bg-orange-500/20 text-orange-400 border-orange-500/40",
  Growth: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
  Pricing: "bg-yellow-500/20 text-yellow-400 border-yellow-500/40",
  Technical: "bg-gray-500/20 text-gray-400 border-gray-500/40",
};

function getCategoryColor(category: string | null): string {
  if (!category) return "bg-gray-500/20 text-gray-400 border-gray-500/40";
  return CATEGORY_COLORS[category] || "bg-gray-500/20 text-gray-400 border-gray-500/40";
}

export default async function PainPointDetailPage(props: PageProps) {
  const params = await props.params;
  const painPoint = await getPainPointById(params.slug);

  if (!painPoint) {
    notFound();
  }

  // Fetch related case if exists
  let relatedCase = null;
  if (painPoint.related_case_id) {
    try {
      relatedCase = await fetchVaultProjectDetail(painPoint.related_case_id, {
        requirePublic: true,
      });
    } catch (error) {
      console.warn("Failed to fetch related case:", error);
    }
  }

  const categoryColor = getCategoryColor(painPoint.category);

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-8 px-6 py-12">
      <PainPointDetailTracker
        painPointId={painPoint.id}
        category={painPoint.category}
        niche={painPoint.niche}
        text={painPoint.text}
      />

      {/* Back Navigation */}
      <Link
        href="/pain-points"
        className="flex items-center gap-2 text-sm text-zinc-400 hover:text-primary transition"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Pain Point Explorer
      </Link>

      {/* Main Content */}
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex flex-wrap gap-2">
              {painPoint.category && (
                <Badge variant="neutral" className={`${categoryColor} border`}>
                  {painPoint.category}
                </Badge>
              )}
              {painPoint.niche && (
                <Badge variant="neutral" className="border-zinc-500/40 bg-zinc-500/20 text-zinc-400">
                  {painPoint.niche}
                </Badge>
              )}
              {painPoint.source && (
                <Badge variant="neutral" className="border-zinc-500/40 bg-zinc-500/20 text-zinc-400">
                  Source: {painPoint.source}
                </Badge>
              )}
            </div>
            {painPoint.frequency && painPoint.frequency > 1 && (
              <div className="rounded-full bg-[#111113] px-3 py-1 text-sm font-medium text-zinc-300">
                Reported {painPoint.frequency}x
              </div>
            )}
          </div>
          <CardTitle className="mt-4 text-2xl font-bold leading-relaxed text-zinc-50">
            {painPoint.text}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Proof Link */}
          {painPoint.proof_link && (
            <div className="rounded-lg border border-white/10 bg-[#111113]/50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-zinc-300">
                <ExternalLink className="h-4 w-4" />
                Original Discussion
              </div>
              <a
                href={painPoint.proof_link}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 block text-sm text-primary hover:underline break-all"
              >
                {painPoint.proof_link}
              </a>
            </div>
          )}

          {/* Related Playbook */}
          {painPoint.related_playbook && (
            <div className="rounded-lg border border-secondary/30 bg-secondary/10 p-6">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-secondary mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-50">
                    Recommended Playbook
                  </h3>
                  <p className="mt-1 text-sm text-zinc-400">
                    Learn how to solve this problem with proven strategies
                  </p>
                  <Link href={`/playbook/${painPoint.related_playbook}`}>
                    <Button variant="outline" size="sm" className="mt-3">
                      View Playbook →
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Related Case Study */}
          {relatedCase && (
            <div className="rounded-lg border border-primary/30 bg-primary/10 p-6">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-zinc-50">
                    Related Case Study
                  </h3>
                  <p className="mt-2 font-medium text-zinc-200">
                    {relatedCase.title}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400 line-clamp-2">
                    {relatedCase.idea_description}
                  </p>
                  <Link href={`/project/${relatedCase.id}`}>
                    <Button variant="outline" size="sm" className="mt-3">
                      View Case Study
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="border-t border-white/10 pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-zinc-400">Last Seen:</span>
                <span className="ml-2 text-zinc-200">
                  {painPoint.last_seen
                    ? new Date(painPoint.last_seen).toLocaleDateString()
                    : "Unknown"}
                </span>
              </div>
              <div>
                <span className="text-zinc-400">Added:</span>
                <span className="ml-2 text-zinc-200">
                  {new Date(painPoint.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-secondary/10">
        <CardContent className="py-8 text-center">
          <h2 className="text-xl font-semibold text-zinc-50">
            Struggling with this too?
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Validate your solution idea with Realwebwins research agent
          </p>
          <Link href="/">
            <Button className="mt-4">Validate Your Idea</Button>
          </Link>
        </CardContent>
      </Card>
    </main>
  );
}
