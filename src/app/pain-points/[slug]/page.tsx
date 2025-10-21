import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink, BookOpen, Lightbulb } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getPainPointById } from "@/lib/painpoints/queryPainPoints";
import { fetchVaultProjectDetail } from "@/lib/vaultData";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{
    slug: string;
  }>;
}

const CATEGORY_COLORS: Record<string, string> = {
  Marketing: "bg-blue-100 text-blue-700 border-blue-200",
  Monetization: "bg-green-100 text-green-700 border-green-200",
  Motivation: "bg-purple-100 text-purple-700 border-purple-200",
  Product: "bg-orange-100 text-orange-700 border-orange-200",
  Growth: "bg-emerald-100 text-emerald-700 border-emerald-200",
  Pricing: "bg-yellow-100 text-yellow-700 border-yellow-200",
  Technical: "bg-gray-100 text-gray-700 border-gray-200",
};

function getCategoryColor(category: string | null): string {
  if (!category) return "bg-gray-100 text-gray-700 border-gray-200";
  return CATEGORY_COLORS[category] || "bg-gray-100 text-gray-700 border-gray-200";
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
      {/* Back Navigation */}
      <Link
        href="/pain-points"
        className="flex items-center gap-2 text-sm text-slate-600 hover:text-primary transition"
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
                <Badge variant="outline" className={`${categoryColor} border`}>
                  {painPoint.category}
                </Badge>
              )}
              {painPoint.niche && (
                <Badge variant="outline" className="border-slate-200">
                  {painPoint.niche}
                </Badge>
              )}
              {painPoint.source && (
                <Badge variant="outline" className="border-slate-300">
                  Source: {painPoint.source}
                </Badge>
              )}
            </div>
            {painPoint.frequency && painPoint.frequency > 1 && (
              <div className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-700">
                Reported {painPoint.frequency}x
              </div>
            )}
          </div>
          <CardTitle className="mt-4 text-2xl font-bold leading-relaxed text-slate-900">
            {painPoint.text}
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Proof Link */}
          {painPoint.proof_link && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
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
            <div className="rounded-lg border border-secondary/30 bg-secondary/5 p-6">
              <div className="flex items-start gap-3">
                <BookOpen className="h-5 w-5 text-secondary mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">
                    Recommended Playbook
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
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
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-6">
              <div className="flex items-start gap-3">
                <Lightbulb className="h-5 w-5 text-primary mt-0.5" />
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900">
                    Related Case Study
                  </h3>
                  <p className="mt-2 font-medium text-slate-800">
                    {relatedCase.title}
                  </p>
                  <p className="mt-1 text-sm text-slate-600 line-clamp-2">
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
          <div className="border-t border-slate-200 pt-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-slate-500">Last Seen:</span>
                <span className="ml-2 text-slate-900">
                  {painPoint.last_seen
                    ? new Date(painPoint.last_seen).toLocaleDateString()
                    : "Unknown"}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Added:</span>
                <span className="ml-2 text-slate-900">
                  {new Date(painPoint.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* CTA */}
      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/5">
        <CardContent className="py-8 text-center">
          <h2 className="text-xl font-semibold text-slate-900">
            Struggling with this too?
          </h2>
          <p className="mt-2 text-sm text-slate-600">
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
