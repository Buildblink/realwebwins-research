-- Phase 15.2 – Analytics Dashboard View (Optional)
-- Helper view with latest week snapshot per metric

CREATE OR REPLACE VIEW public.analytics_latest_week AS
WITH latest AS (
  SELECT MAX(period_start) AS period_start FROM public.analytics_metrics
)
SELECT m.metric_type, m.period_start, m.period_end, m.value
FROM public.analytics_metrics m
JOIN latest l ON m.period_start = l.period_start;

COMMENT ON VIEW public.analytics_latest_week IS 'Latest week snapshot for each metric type (Remix, Referral, Affiliate, Credits)';
