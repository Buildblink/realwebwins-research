-- Fix Phase 15 column types
-- referrer_user_id should be text (not uuid) to support arbitrary referral codes
-- user_credits.user_id should also be text for consistency

-- Fix referral_clicks.referrer_user_id
ALTER TABLE referral_clicks
ALTER COLUMN referrer_user_id TYPE text;

-- Fix user_credits.user_id
ALTER TABLE user_credits
ALTER COLUMN user_id TYPE text;

COMMENT ON COLUMN referral_clicks.referrer_user_id IS 'Referrer user ID or referral code (text, not uuid)';
COMMENT ON COLUMN user_credits.user_id IS 'User ID or referral code (text, not uuid)';
