"use client";

import { useCallback, useState } from "react";
import { Share2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface VaultShareButtonProps {
  url: string;
}

export function VaultShareButton({ url }: VaultShareButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const shareTarget =
      url.startsWith("http://") || url.startsWith("https://")
        ? url
        : `${window.location.origin}${url}`;
    try {
      await navigator.clipboard.writeText(shareTarget);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("[VaultShareButton] failed to copy url", error);
      window.alert("Unable to copy the URL. Please copy it manually.");
    }
  }, [url]);

  return (
    <Button type="button" variant="outline" size="sm" className="gap-2" onClick={handleCopy}>
      <Share2 className="h-4 w-4" />
      {copied ? "Copied!" : "Share"}
    </Button>
  );
}
