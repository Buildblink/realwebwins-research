-- Phase 14.5 → 15: Remix, Referrals, Affiliate Tracking
-- Creates tables for viral growth features

-- Update workspace_remixes structure (rename columns for clarity)
-- Note: workspace_remixes table already exists from Phase 14, this ensures correct structure
CREATE TABLE IF NOT EXISTS workspace_remixes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  new_workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  referrer_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_remixes_source ON workspace_remixes(source_workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_remixes_new ON workspace_remixes(new_workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_remixes_referrer ON workspace_remixes(referrer_user_id);

-- Lightweight referral clicks (no leaderboard, only credits)
CREATE TABLE IF NOT EXISTS referral_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_user_id uuid,
  target_path text NOT NULL,
  ip_hash text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referral_clicks_referrer ON referral_clicks(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_referral_clicks_created_at ON referral_clicks(created_at DESC);

-- Affiliate click tracking
CREATE TABLE IF NOT EXISTS affiliate_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  playbook_slug text,
  tool_name text NOT NULL,
  url text NOT NULL,
  ref text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_workspace ON affiliate_clicks(workspace_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_tool ON affiliate_clicks(tool_name);
CREATE INDEX IF NOT EXISTS idx_affiliate_clicks_created_at ON affiliate_clicks(created_at DESC);

-- Optional: credit balance per user (basic integer)
CREATE TABLE IF NOT EXISTS user_credits (
  user_id uuid PRIMARY KEY,
  balance int DEFAULT 0 NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_credits_balance ON user_credits(balance DESC) WHERE balance > 0;

COMMENT ON TABLE workspace_remixes IS 'Tracks when users remix/clone published workspaces';
COMMENT ON TABLE referral_clicks IS 'Logs referral link clicks with ?ref= parameter';
COMMENT ON TABLE affiliate_clicks IS 'Tracks affiliate tool link clicks before redirect';
COMMENT ON TABLE user_credits IS 'Simple credit balance for referral rewards';
