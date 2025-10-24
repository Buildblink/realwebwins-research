import { NextResponse } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { startOfWeek, endOfWeek } from "date-fns";
import type { MetricConfig, AggregatedMetric, AnalyticsAggregateResponse } from "@/types/analytics";

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
 * POST /api/analytics/aggregate
 * Manual trigger to aggregate viral growth metrics
 * Returns data without saving to database
 */
export async function POST() {
  const supabase = getSupabaseAdminClient();

  try {
    const now = new Date();
    const periodStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
    const periodEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday

    console.log('[analytics.aggregate] Aggregating metrics for period:', {
      start: periodStart.toISOString(),
      end: periodEnd.toISOString()
    });

    const results: AggregatedMetric[] = [];

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
            console.error(`[analytics.aggregate] Failed to count ${metric.type}:`, error);
            continue;
          }

          value = count ?? 0;
        } else if (metric.aggregation === 'sum' && metric.field) {
          // Sum a specific field (e.g., total credits)
          const { data, error } = await supabase
            .from(metric.table)
            .select(metric.field);

          if (error) {
            console.error(`[analytics.aggregate] Failed to sum ${metric.type}:`, error);
            continue;
          }

          value = data?.reduce((sum, row) => sum + (row[metric.field!] || 0), 0) ?? 0;
        }

        results.push({
          metric_type: metric.type,
          period_start: periodStart.toISOString(),
          period_end: periodEnd.toISOString(),
          value,
          metadata: { description: metric.description }
        });

        console.log(`[analytics.aggregate] ${metric.type}: ${value}`);
      } catch (metricError) {
        console.error(`[analytics.aggregate] Error processing ${metric.type}:`, metricError);
        continue;
      }
    }

    // Log to AgentStatus
    try {
      await supabase.from('AgentStatus').insert({
        idea: 'viral-growth',
        stage: 'aggregate',
        success: true,
        meta: JSON.stringify({
          period: {
            start: periodStart.toISOString(),
            end: periodEnd.toISOString()
          },
          metrics: results.map(r => ({ type: r.metric_type, value: r.value }))
        })
      });
    } catch (logError) {
      console.warn('[analytics.aggregate] Failed to log to AgentStatus:', logError);
    }

    const response: AnalyticsAggregateResponse = {
      success: true,
      data: results,
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString()
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('[analytics.aggregate] Unexpected error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';

    // Log failure to AgentStatus
    try {
      const supabase = getSupabaseAdminClient();
      await supabase.from('AgentStatus').insert({
        idea: 'viral-growth',
        stage: 'aggregate',
        success: false,
        meta: JSON.stringify({ error: message })
      });
    } catch (logError) {
      console.warn('[analytics.aggregate] Failed to log error:', logError);
    }

    const response: AnalyticsAggregateResponse = {
      success: false,
      error: 'AGGREGATION_FAILED',
      message: `Failed to aggregate metrics: ${message}`
    };

    return NextResponse.json(response, { status: 500 });
  }
}
