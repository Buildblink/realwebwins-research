/**
 * Analytics metric type definitions
 * Phase 15.1 - Weekly aggregation of viral growth metrics
 */

export type MetricKey = 'remix' | 'referral' | 'affiliate' | 'credits';

export interface MetricConfig {
  type: MetricKey;
  table: string;
  aggregation: 'count' | 'sum';
  field?: string; // For sum aggregation
  description: string;
}

export interface AggregatedMetric {
  metric_type: MetricKey;
  period_start: string;
  period_end: string;
  value: number;
  metadata?: Record<string, unknown>;
}

export interface AnalyticsAggregateResponse {
  success: boolean;
  data?: AggregatedMetric[];
  error?: string;
  message?: string;
  period?: {
    start: string;
    end: string;
  };
}

export interface AnalyticsCronResponse {
  success: boolean;
  message: string;
  metrics?: {
    aggregated: number;
    failed: number;
  };
  period?: {
    start: string;
    end: string;
  };
}
