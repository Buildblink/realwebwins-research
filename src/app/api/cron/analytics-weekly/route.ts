import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { startOfWeek, endOfWeek } from "date-fns";
import type { MetricConfig, AnalyticsCronResponse } from "@/types/analytics";

const METRICS: MetricConfig[] = [
  {
    type: 'remix',
    table: 'workspace_remixes',
    aggregation: 'count',
    description: 'Workspace clones this week'
  },
  {
    type: 'referral',
    table: 'referral_clicks',
    aggregation: 'count',
    description: 'Referral link clicks this week'
  },
  {
    type: 'affiliate',
    table: 'affiliate_clicks',
    aggregation: 'count',
    description: 'Affiliate tool clicks this week'
  },
  {
    type: 'credits',
    table: 'user_credits',
    aggregation: 'sum',
    field: 'balance',
    description: 'Total credits distributed (cumulative)'
  }
];

/**
 * POST /api/cron/analytics-weekly
 * Weekly cron job to aggregate and save viral growth metrics
 * Protected by WEEKLY_SUMMARY_SECRET
 */
export async function POST(request: Request) {
  const supabase = getSupabaseAdminClient();

  try {
    // Verify authorization
    const authHeader = request.headers.get("authorization");
    const expectedAuth = `Bearer ${process.env.WEEKLY_SUMMARY_SECRET}`;

    if (authHeader !== expectedAuth) {
      console.warn('[analytics.cron] Unauthorized request');
      return NextResponse.json(
        {
          success: false,
          error: 'UNAUTHORIZED',
          message: 'Invalid or missing authorization'
        },
        { status: 401 }
      );
    }

    const now = new Date();
    const periodStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const periodEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

    console.log('[analytics.cron] Starting weekly aggregation:', {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString()
    });

    let aggregated = 0;
    let failed = 0;

    for (const metric of METRICS) {
      try {
        let value = 0;

        if (metric.aggregation === 'count') {
          // Count rows created this week
          const { count, error } = await supabase
            .from(metric.table)
            .select('*', { count: 'exact', head: true })
            .gte('created_at', periodStart.toISOString())
            .lte('created_at', periodEnd.toISOString());

          if (error) {
            console.error(`[analytics.cron] Failed to count ${metric.type}:`, error);
            failed++;
            continue;
          }

          value = count ?? 0;
        } else if (metric.aggregation === 'sum' && metric.field) {
          // Sum a specific field (total credits distributed)
          const { data, error } = await supabase
            .from(metric.table)
            .select(metric.field);

          if (error) {
            console.error(`[analytics.cron] Failed to sum ${metric.type}:`, error);
            failed++;
            continue;
          }

          value = data?.reduce((sum, row) => sum + (row[metric.field!] || 0), 0) ?? 0;
        }

        // Upsert to analytics_metrics
        const { error: upsertError } = await supabase
          .from('analytics_metrics')
          .upsert({
            metric_type: metric.type,
            period_start: periodStart.toISOString(),
            period_end: periodEnd.toISOString(),
            value,
            metadata: { description: metric.description },
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'metric_type,period_start,period_end'
          });

        if (upsertError) {
          console.error(`[analytics.cron] Failed to upsert ${metric.type}:`, upsertError);
          failed++;
          continue;
        }

        console.log(`[analytics.cron] Saved ${metric.type}: ${value}`);
        aggregated++;
      } catch (metricError) {
        console.error(`[analytics.cron] Error processing ${metric.type}:`, metricError);
        failed++;
      }
    }

    // Log to AgentStatus
    try {
      await supabase.from('AgentStatus').insert({
        idea: 'viral-growth',
        stage: 'cron',
        success: failed === 0,
        meta: JSON.stringify({
          period: {
            start: periodStart.toISOString(),
            end: periodEnd.toISOString()
          },
          aggregated,
          failed
        })
      });
    } catch (logError) {
      console.warn('[analytics.cron] Failed to log to AgentStatus:', logError);
    }

    const response: AnalyticsCronResponse = {
      success: failed === 0,
      message: failed === 0
        ? `Successfully aggregated ${aggregated} metrics`
        : `Aggregated ${aggregated} metrics, ${failed} failed`,
      metrics: { aggregated, failed },
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString()
      }
    };

    return NextResponse.json(response, { status: failed === 0 ? 200 : 207 });
  } catch (error) {
    console.error('[analytics.cron] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Log failure to AgentStatus
    try {
      const supabase = getSupabaseAdminClient();
      await supabase.from('AgentStatus').insert({
        idea: 'viral-growth',
        stage: 'cron',
        success: false,
        meta: JSON.stringify({ error: message })
      });
    } catch (logError) {
      console.warn('[analytics.cron] Failed to log error:', logError);
    }

    const response: AnalyticsCronResponse = {
      success: false,
      message: `Weekly aggregation failed: ${message}`
    };

    return NextResponse.json(response, { status: 500 });
  }
}
