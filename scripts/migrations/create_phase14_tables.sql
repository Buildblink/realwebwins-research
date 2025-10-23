-- Phase 14: Community & Growth Flywheel Schema
-- Creates tables for user profiles, public workspaces, and referral tracking

-- User profiles for public identity
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid UNIQUE,
  username text UNIQUE NOT NULL,
  bio text,
  avatar_url text,
  links jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- Public workspaces for showcase/sharing
CREATE TABLE IF NOT EXISTS public_workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  published boolean DEFAULT false,
  title text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  category text,
  views int DEFAULT 0,
  remix_count int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_public_workspaces_workspace_id ON public_workspaces(workspace_id);
CREATE INDEX IF NOT EXISTS idx_public_workspaces_slug ON public_workspaces(slug);
CREATE INDEX IF NOT EXISTS idx_public_workspaces_published ON public_workspaces(published) WHERE published = true;
CREATE INDEX IF NOT EXISTS idx_public_workspaces_category ON public_workspaces(category);

-- Referral tracking for growth
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid,
  referred_user_id uuid,
  referral_code text,
  clicks int DEFAULT 0,
  conversions int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_user_id ON referrals(referred_user_id);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(referral_code);

-- Workspace remixes tracking
CREATE TABLE IF NOT EXISTS workspace_remixes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  remixed_workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  remixed_by_user_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_remixes_original ON workspace_remixes(original_workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_remixes_remixed ON workspace_remixes(remixed_workspace_id);
CREATE INDEX IF NOT EXISTS idx_workspace_remixes_user ON workspace_remixes(remixed_by_user_id);

-- Add published_workspace_id to workspaces for easy lookup
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS published_workspace_id uuid REFERENCES public_workspaces(id);

CREATE INDEX IF NOT EXISTS idx_workspaces_published ON workspaces(published_workspace_id) WHERE published_workspace_id IS NOT NULL;

COMMENT ON TABLE profiles IS 'User public profiles with username, bio, and social links';
COMMENT ON TABLE public_workspaces IS 'Published workspaces visible in showcase';
COMMENT ON TABLE referrals IS 'Referral tracking for growth and leaderboard';
COMMENT ON TABLE workspace_remixes IS 'Tracks when users remix/clone workspaces';
