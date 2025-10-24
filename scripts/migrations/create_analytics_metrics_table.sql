-- Phase 15.1 – Analytics Metrics Table
-- Stores weekly aggregations for viral growth metrics

CREATE TABLE IF NOT EXISTS analytics_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_type text NOT NULL,                -- remix | referral | affiliate | credits
  period_start timestamptz NOT NULL,        -- Week start (Monday 00:00)
  period_end timestamptz NOT NULL,          -- Week end (Sunday 23:59)
  value integer NOT NULL DEFAULT 0,         -- Weekly count or sum
  metadata jsonb DEFAULT '{}'::jsonb,       -- Optional: breakdown by category, etc.
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT unique_metric_period UNIQUE (metric_type, period_start, period_end),
  CONSTRAINT valid_metric_type CHECK (metric_type IN ('remix', 'referral', 'affiliate', 'credits'))
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_type ON analytics_metrics(metric_type);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_period ON analytics_metrics(period_start DESC, period_end DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_metrics_created ON analytics_metrics(created_at DESC);

-- Comments for documentation
COMMENT ON TABLE analytics_metrics IS 'Weekly aggregations for viral growth events (Remix, Referral, Affiliate, Credits)';
COMMENT ON COLUMN analytics_metrics.metric_type IS 'Type of metric: remix (workspace clones), referral (link clicks), affiliate (tool clicks), credits (total distributed)';
COMMENT ON COLUMN analytics_metrics.period_start IS 'Week start timestamp (Monday 00:00 UTC)';
COMMENT ON COLUMN analytics_metrics.period_end IS 'Week end timestamp (Sunday 23:59 UTC)';
COMMENT ON COLUMN analytics_metrics.value IS 'Aggregated value: count for remix/referral/affiliate, sum for credits';
COMMENT ON COLUMN analytics_metrics.metadata IS 'Optional JSON for additional context (e.g., top referrers, categories)';
