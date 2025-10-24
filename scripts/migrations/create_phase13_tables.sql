-- Phase 13: Intelligence & Personalization Schema
-- Creates tables for analytics tracking and AI personalization

-- Analytics tracking for all user interactions
CREATE TABLE IF NOT EXISTS user_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  event text NOT NULL,
  context jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_user_events_user_id ON user_events(user_id);
CREATE INDEX IF NOT EXISTS idx_user_events_event ON user_events(event);
CREATE INDEX IF NOT EXISTS idx_user_events_created_at ON user_events(created_at DESC);

-- Workspace memory summaries for AI personalization
CREATE TABLE IF NOT EXISTS workspace_memories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid REFERENCES workspaces(id) ON DELETE CASCADE,
  summary text NOT NULL,
  tokens_used int DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_workspace_memories_workspace_id ON workspace_memories(workspace_id);
CREATE UNIQUE INDEX IF NOT EXISTS ux_workspace_memories_workspace ON workspace_memories(workspace_id);

-- Add rating column to workspace_outputs for feedback tracking
ALTER TABLE workspace_outputs
ADD COLUMN IF NOT EXISTS rating int CHECK (rating >= -1 AND rating <= 1);

CREATE INDEX IF NOT EXISTS idx_workspace_outputs_rating ON workspace_outputs(rating) WHERE rating IS NOT NULL;

-- Add user_id to workspaces table if not exists (for personalization)
ALTER TABLE workspaces
ADD COLUMN IF NOT EXISTS user_id uuid;

CREATE INDEX IF NOT EXISTS idx_workspaces_user_id ON workspaces(user_id);

COMMENT ON TABLE user_events IS 'Tracks all user interactions for analytics and personalization';
COMMENT ON TABLE workspace_memories IS 'Stores AI-generated summaries of user preferences and patterns';
COMMENT ON COLUMN workspace_outputs.rating IS 'User feedback: -1 (thumbs down), 0 (neutral), 1 (thumbs up)';
