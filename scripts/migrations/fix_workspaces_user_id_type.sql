-- Fix workspaces.user_id type from uuid to text
-- This allows arbitrary user identifiers (not just UUIDs)
-- Matches the pattern used in referral_clicks and user_credits

DO $$
DECLARE fk text;
BEGIN
  -- Check for and drop any foreign key constraints on user_id
  SELECT conname INTO fk
  FROM pg_constraint
  WHERE conrelid = 'public.workspaces'::regclass
    AND contype = 'f'
    AND conname ILIKE '%user_id%';

  IF fk IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.workspaces DROP CONSTRAINT %I', fk);
    RAISE NOTICE 'Dropped FK constraint: %', fk;
  END IF;

  -- Convert column type from uuid to text
  ALTER TABLE public.workspaces
    ALTER COLUMN user_id TYPE text USING user_id::text;

  -- Add explanatory comment
  COMMENT ON COLUMN public.workspaces.user_id IS
    'User or referrer identifier (text) – may be UUID or arbitrary string code';

  RAISE NOTICE 'Successfully converted workspaces.user_id to TEXT type';
END$$;
