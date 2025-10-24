"use client";

import { useState } from "react";
import { Share2, Link2, Gift, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ShareMenuProps {
  workspaceId: string;
  painPointId: string;
  userId?: string;
  className?: string;
}

export function ShareMenu({
  workspaceId,
  painPointId,
  userId,
  className,
}: ShareMenuProps) {
  const [copied, setCopied] = useState<"public" | "referral" | null>(null);
  const [showMenu, setShowMenu] = useState(false);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const publicLink = `${baseUrl}/workspace/${painPointId}`;
  const referralLink = userId
    ? `${baseUrl}/workspace/${painPointId}?ref=${userId}`
    : publicLink;

  const copyToClipboard = async (text: string, type: "public" | "referral") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(type);

      // Track the share event
      try {
        await fetch("/api/events", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event: "workspace_shared",
            context: {
              workspaceId,
              painPointId,
              type,
              userId,
            },
          }),
        });
      } catch (err) {
        console.warn("[ShareMenu] Failed to track event:", err);
      }

      // Reset after 2 seconds
      setTimeout(() => setCopied(null), 2000);
    } catch (err) {
      console.error("[ShareMenu] Failed to copy:", err);
    }
  };

  return (
    <div className={cn("relative", className)}>
      <Button
        variant="outline"
        size="sm"
        className="gap-2"
        onClick={() => setShowMenu(!showMenu)}
      >
        <Share2 className="h-4 w-4" />
        Share
      </Button>

      {showMenu && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowMenu(false)}
          />

          {/* Menu */}
          <div className="absolute right-0 top-full mt-2 w-72 rounded-lg border border-slate-200 bg-white shadow-lg z-20 p-3 space-y-2">
            {/* Public Link */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                Public Link
              </label>
              <button
                className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-100 transition-colors flex items-center justify-between group"
                onClick={() => copyToClipboard(publicLink, "public")}
              >
                <span className="truncate flex-1">{publicLink}</span>
                {copied === "public" ? (
                  <Check className="h-4 w-4 text-green-600 flex-shrink-0 ml-2" />
                ) : (
                  <span className="text-xs text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                    Click to copy
                  </span>
                )}
              </button>
            </div>

            {/* Referral Link */}
            {userId && (
              <div className="space-y-1">
                <label className="text-xs font-medium text-slate-700 flex items-center gap-1">
                  <Gift className="h-3 w-3" />
                  Referral Link
                  <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded">
                    +1 credit
                  </span>
                </label>
                <button
                  className="w-full rounded-md border border-green-200 bg-green-50 px-3 py-2 text-left text-sm text-slate-700 hover:bg-green-100 transition-colors flex items-center justify-between group"
                  onClick={() => copyToClipboard(referralLink, "referral")}
                >
                  <span className="truncate flex-1">{referralLink}</span>
                  {copied === "referral" ? (
                    <Check className="h-4 w-4 text-green-600 flex-shrink-0 ml-2" />
                  ) : (
                    <span className="text-xs text-green-600 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2">
                      Click to copy
                    </span>
                  )}
                </button>
                <p className="text-xs text-slate-500 mt-1">
                  Earn credits when people visit via your link
                </p>
              </div>
            )}

            {!userId && (
              <p className="text-xs text-slate-500 italic">
                Sign in to get a referral link and earn credits
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
