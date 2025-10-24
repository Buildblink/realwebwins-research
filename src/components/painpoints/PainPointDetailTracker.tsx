"use client";

import { useEffect } from "react";
import { useAnalytics, EVENT_TYPES } from "@/hooks/useAnalytics";

interface PainPointDetailTrackerProps {
  painPointId: string;
  category: string | null;
  niche: string | null;
  text: string;
}

/**
 * Client component to track pain point detail page views
 * Wraps server component content
 */
export function PainPointDetailTracker({
  painPointId,
  category,
  niche,
  text,
}: PainPointDetailTrackerProps) {
  const { trackEvent } = useAnalytics();

  useEffect(() => {
    trackEvent(EVENT_TYPES.PAIN_POINT_VIEWED, {
      painPointId,
      category,
      niche,
      textPreview: text.substring(0, 100),
    });
  }, [painPointId, category, niche, text, trackEvent]);

  return null; // This component only tracks, doesn't render anything
}
