-- Phase 17-18: Agent Conversations
CREATE TABLE IF NOT EXISTS agent_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL,
  sender_agent text NOT NULL,
  receiver_agent text NOT NULL,
  role text DEFAULT 'assistant',
  content text NOT NULL,
  meta jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_messages_conversation
  ON agent_messages(conversation_id, created_at ASC);

COMMENT ON TABLE agent_messages IS 'All messages exchanged between AI agents (and optionally humans).';
