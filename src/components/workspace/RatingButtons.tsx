"use client";

import { useState } from "react";
import { ThumbsUp, ThumbsDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface RatingButtonsProps {
  outputId: string;
  painPointId: string;
  initialRating?: number | null;
  onRatingChange?: (rating: number) => void;
  className?: string;
}

export function RatingButtons({
  outputId,
  painPointId,
  initialRating = 0,
  onRatingChange,
  className = "",
}: RatingButtonsProps) {
  const [rating, setRating] = useState<number>(initialRating ?? 0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRating = async (newRating: -1 | 1) => {
    // Toggle: if already rated with this value, clear it
    const finalRating = rating === newRating ? 0 : newRating;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/workspace/${painPointId}/rating`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          outputId,
          rating: finalRating,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to save rating (${response.status})`);
      }

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message ?? "Rating request failed");
      }

      setRating(finalRating);
      onRatingChange?.(finalRating);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("[RatingButtons] Failed to save rating", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <span className="text-xs text-zinc-500">Rate this section:</span>

      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRating(1)}
          disabled={isSubmitting}
          className={cn(
            "h-8 w-8 p-0 transition-colors",
            rating === 1
              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 hover:text-emerald-800"
              : "text-zinc-400 hover:text-emerald-600"
          )}
        >
          <ThumbsUp className="h-4 w-4" />
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={() => handleRating(-1)}
          disabled={isSubmitting}
          className={cn(
            "h-8 w-8 p-0 transition-colors",
            rating === -1
              ? "bg-rose-100 text-rose-700 hover:bg-rose-200 hover:text-rose-800"
              : "text-zinc-400 hover:text-rose-600"
          )}
        >
          <ThumbsDown className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <span className="text-xs text-rose-600">
          {error}
        </span>
      )}
    </div>
  );
}
