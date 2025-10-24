-- Fix workspace_remixes column names
-- Phase 14 created: original_workspace_id, remixed_workspace_id, remixed_by_user_id
-- Phase 15 expects: source_workspace_id, new_workspace_id, referrer_user_id

DO $$
BEGIN
  -- Check if old columns exist and rename them
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_remixes'
    AND column_name = 'original_workspace_id'
  ) THEN
    ALTER TABLE workspace_remixes
      RENAME COLUMN original_workspace_id TO source_workspace_id;
    RAISE NOTICE 'Renamed original_workspace_id → source_workspace_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_remixes'
    AND column_name = 'remixed_workspace_id'
  ) THEN
    ALTER TABLE workspace_remixes
      RENAME COLUMN remixed_workspace_id TO new_workspace_id;
    RAISE NOTICE 'Renamed remixed_workspace_id → new_workspace_id';
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_remixes'
    AND column_name = 'remixed_by_user_id'
  ) THEN
    -- First drop the index on the old column name
    DROP INDEX IF EXISTS idx_workspace_remixes_user;

    ALTER TABLE workspace_remixes
      RENAME COLUMN remixed_by_user_id TO referrer_user_id;
    RAISE NOTICE 'Renamed remixed_by_user_id → referrer_user_id';

    -- Recreate index with new column name
    CREATE INDEX IF NOT EXISTS idx_workspace_remixes_referrer
      ON workspace_remixes(referrer_user_id);
  END IF;

  -- Also need to change referrer_user_id type from uuid to text
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'workspace_remixes'
    AND column_name = 'referrer_user_id'
    AND data_type = 'uuid'
  ) THEN
    ALTER TABLE workspace_remixes
      ALTER COLUMN referrer_user_id TYPE text USING referrer_user_id::text;
    RAISE NOTICE 'Changed referrer_user_id type: uuid → text';
  END IF;

  RAISE NOTICE 'workspace_remixes schema updated successfully';
END$$;
