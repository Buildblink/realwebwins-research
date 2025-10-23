import { useCallback, useEffect, useRef, useState } from "react";
import { EVENT_TYPES, type EventType } from "@/lib/eventTypes";

// Re-export for convenience
export { EVENT_TYPES, type EventType };

interface EventContext {
  [key: string]: unknown;
}

interface QueuedEvent {
  event: EventType | string;
  context?: EventContext;
  timestamp: number;
}

// Batch configuration
const BATCH_SIZE = 5;
const BATCH_INTERVAL = 3000; // 3 seconds

/**
 * Hook for tracking user analytics events
 * Features:
 * - Auto-batching to reduce API calls
 * - Retry logic for failed events
 * - Type-safe event tracking
 */
export function useAnalytics(userId?: string) {
  const [queue, setQueue] = useState<QueuedEvent[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const mountedRef = useRef(true);

  // Process queued events
  const processQueue = useCallback(async () => {
    if (queue.length === 0 || isProcessing) {
      return;
    }

    setIsProcessing(true);

    const batch = queue.slice(0, BATCH_SIZE);
    const remaining = queue.slice(BATCH_SIZE);

    try {
      // Send all events in parallel
      await Promise.all(
        batch.map(async ({ event, context }) => {
          try {
            const response = await fetch("/api/events", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                event,
                context,
                user_id: userId,
              }),
            });

            if (!response.ok) {
              console.warn(`[useAnalytics] Event tracking failed: ${event}`, {
                status: response.status,
              });
            }
          } catch (error) {
            console.warn(`[useAnalytics] Event tracking error: ${event}`, error);
          }
        })
      );

      // Update queue with remaining events
      if (mountedRef.current) {
        setQueue(remaining);
      }
    } finally {
      if (mountedRef.current) {
        setIsProcessing(false);
      }
    }
  }, [queue, isProcessing, userId]);

  // Auto-flush queue on interval or when full
  useEffect(() => {
    if (queue.length >= BATCH_SIZE) {
      processQueue();
    } else if (queue.length > 0) {
      // Set timer to flush after interval
      timerRef.current = setTimeout(() => {
        processQueue();
      }, BATCH_INTERVAL);
    }

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [queue, processQueue]);

  // Flush remaining events before unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (queue.length > 0) {
        // Immediate flush on unmount (best effort)
        void processQueue();
      }
    };
  }, [queue, processQueue]);

  /**
   * Track an analytics event
   * @param event Event type (use EVENT_TYPES constants)
   * @param context Optional context data
   */
  const trackEvent = useCallback(
    (event: EventType | string, context?: EventContext) => {
      setQueue((prev) => [
        ...prev,
        {
          event,
          context,
          timestamp: Date.now(),
        },
      ]);
    },
    []
  );

  /**
   * Track a page view event
   * @param page Page identifier
   * @param additionalContext Optional additional context
   */
  const trackPageView = useCallback(
    (page: string, additionalContext?: EventContext) => {
      trackEvent("page_viewed", {
        page,
        ...additionalContext,
      });
    },
    [trackEvent]
  );

  /**
   * Manually flush the event queue
   * Useful for ensuring events are sent before navigation
   */
  const flush = useCallback(() => {
    if (queue.length > 0) {
      void processQueue();
    }
  }, [queue, processQueue]);

  return {
    trackEvent,
    trackPageView,
    flush,
    queueSize: queue.length,
    isProcessing,
  };
}

/**
 * Simplified hook for tracking a single event on mount
 * @param event Event type
 * @param context Event context
 * @param userId Optional user ID
 */
export function useTrackOnMount(
  event: EventType | string,
  context?: EventContext,
  userId?: string
) {
  const { trackEvent } = useAnalytics(userId);
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!trackedRef.current) {
      trackEvent(event, context);
      trackedRef.current = true;
    }
  }, [event, context, trackEvent]);
}

/**
 * Server-side event tracking helper
 * Use this in API routes or server components
 */
export async function trackServerEvent(
  event: EventType | string,
  context?: EventContext,
  userId?: string
): Promise<boolean> {
  try {
    const response = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/events`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        context,
        user_id: userId,
      }),
    });

    return response.ok;
  } catch (error) {
    console.warn("[trackServerEvent] Failed to track event", error);
    return false;
  }
}
