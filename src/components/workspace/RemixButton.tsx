"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RemixButtonProps {
  workspaceId: string;
  userId?: string;
  referrerUserId?: string;
  variant?: "default" | "secondary" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showLabel?: boolean;
  onSuccess?: (newWorkspaceId: string) => void;
}

export function RemixButton({
  workspaceId,
  userId,
  referrerUserId,
  variant = "secondary",
  size = "default",
  className,
  showLabel = true,
  onSuccess,
}: RemixButtonProps) {
  const [isRemixing, setIsRemixing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleRemix = async () => {
    if (isRemixing) return;

    setIsRemixing(true);
    setError(null);

    try {
      const response = await fetch(`/api/remix/${workspaceId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: userId || null,
          ref: referrerUserId || null,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || "Failed to remix workspace");
      }

      const newWorkspaceId = result.data?.newWorkspaceId;
      const newPainPointId = result.data?.newPainPointId;

      if (!newPainPointId) {
        throw new Error("No pain point ID returned");
      }

      // Call success callback if provided
      if (onSuccess && newWorkspaceId) {
        onSuccess(newWorkspaceId);
      }

      // Show success message (using a simple timeout for now)
      console.log("✅ Workspace remixed successfully!");

      // Redirect to the new workspace
      router.push(`/workspace/${newPainPointId}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("[RemixButton] Failed to remix:", message);

      // Auto-clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setIsRemixing(false);
    }
  };

  return (
    <div className="relative">
      <Button
        variant={variant}
        size={size}
        className={cn("gap-2", className)}
        onClick={handleRemix}
        disabled={isRemixing}
      >
        {isRemixing ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {showLabel && "Remixing..."}
          </>
        ) : (
          <>
            <Copy className="h-4 w-4" />
            {showLabel && "Remix This"}
          </>
        )}
      </Button>

      {error && (
        <div className="absolute top-full left-0 mt-2 w-64 rounded-md bg-red-50 border border-red-200 p-3 text-sm text-red-800 shadow-lg z-10">
          {error}
        </div>
      )}
    </div>
  );
}
