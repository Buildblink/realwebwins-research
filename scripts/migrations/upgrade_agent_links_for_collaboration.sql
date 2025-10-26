-- Phase 27: Enhance agent link structure for collaboration workflows
ALTER TABLE agent_links
  RENAME COLUMN relationship TO collaboration_type;

ALTER TABLE agent_links
  ADD COLUMN IF NOT EXISTS strength numeric DEFAULT 0.5;

ALTER TABLE agent_links
  ALTER COLUMN collaboration_type SET DEFAULT 'relay',
  ALTER COLUMN collaboration_type SET NOT NULL;

ALTER TABLE agent_links
  DROP CONSTRAINT IF EXISTS agent_links_collaboration_type_check;

ALTER TABLE agent_links
  ADD CONSTRAINT agent_links_collaboration_type_check
  CHECK (collaboration_type IN ('relay', 'assist', 'analyze'));
