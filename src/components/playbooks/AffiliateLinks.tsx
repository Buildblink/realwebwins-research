import { ExternalLink, Tag } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { AffiliateLink } from "@/types/playbook";

interface AffiliateLinksProps {
  links: AffiliateLink[];
}

export function AffiliateLinks({ links }: AffiliateLinksProps) {
  if (links.length === 0) {
    return null;
  }

  return (
    <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-6">
      <div className="flex items-center gap-2 mb-4">
        <Tag className="h-5 w-5 text-emerald-700" />
        <h3 className="text-lg font-semibold text-slate-900">Recommended Resources</h3>
      </div>
      <div className="space-y-3">
        {links.map((link, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-lg border border-emerald-200 bg-white p-4"
          >
            <div className="flex-1">
              <div className="font-medium text-slate-900">{link.name}</div>
              {link.description && (
                <p className="text-sm text-slate-600 mt-1">{link.description}</p>
              )}
              {link.price && (
                <p className="text-xs text-emerald-700 font-medium mt-1">{link.price}</p>
              )}
            </div>
            <a
              href={link.url}
              target="_blank"
              rel="noopener noreferrer sponsored"
              className="ml-4"
            >
              <Button size="sm" variant="default">
                <ExternalLink className="h-4 w-4 mr-1" />
                Check it out
              </Button>
            </a>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 mt-4">
        * Some links may be affiliate links. We may earn a commission at no extra cost to
        you.
      </p>
    </div>
  );
}
