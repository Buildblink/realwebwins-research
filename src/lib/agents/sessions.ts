import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";

export interface SessionMessage {
  id: string;
  agent: string;
  role: "system" | "assistant" | "user";
  content: string;
  created_at: string;
  metadata?: Record<string, unknown>;
}

export interface CreateSessionInput {
  painId: string;
  startedBy?: string | null;
  metadata?: Record<string, unknown>;
}

export interface SessionRecord {
  id: string;
  pain_id: string | null;
  started_by: string | null;
  status: string;
  transcript: SessionMessage[];
  metadata: Record<string, unknown>;
  created_at: string;
  completed_at: string | null;
}

export async function createAgentSession(input: CreateSessionInput): Promise<SessionRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_sessions")
    .insert([
      {
        pain_id: input.painId,
        started_by: input.startedBy ?? null,
        metadata: input.metadata ?? {},
        transcript: [],
      },
    ])
    .select()
    .single();

  if (error) {
    throw new Error(`[agent_sessions] failed to insert session: ${error.message}`);
  }

  return normalizeSession(data);
}

export async function appendSessionTranscript(
  sessionId: string,
  message: SessionMessage
) {
  const supabase = getSupabaseAdminClient();
  const session = await getAgentSession(sessionId);
  const updatedTranscript = [...session.transcript, message];
  const { error } = await supabase
    .from("agent_sessions")
    .update({ transcript: updatedTranscript })
    .eq("id", sessionId);

  if (error) {
    throw new Error(`[agent_sessions] Failed to append transcript: ${error.message}`);
  }
}

export async function completeAgentSession(
  sessionId: string,
  extra: Partial<{ status: string; metadata: Record<string, unknown> }> = {}
) {
  const supabase = getSupabaseAdminClient();
  const session = await getAgentSession(sessionId);
  const mergedMetadata = {
    ...(session.metadata ?? {}),
    ...(extra.metadata ?? {}),
  };

  const { error } = await supabase
    .from("agent_sessions")
    .update({
      status: extra.status ?? "completed",
      metadata: mergedMetadata,
      completed_at: new Date().toISOString(),
    })
    .eq("id", sessionId);

  if (error) {
    throw new Error(`[agent_sessions] failed to complete session: ${error.message}`);
  }
}

export async function getAgentSession(sessionId: string): Promise<SessionRecord> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("agent_sessions")
    .select("*")
    .eq("id", sessionId)
    .maybeSingle();

  if (error) {
    throw new Error(`[agent_sessions] failed to load session: ${error.message}`);
  }

  if (!data) {
    throw new Error(`[agent_sessions] Session ${sessionId} not found.`);
  }

  return normalizeSession(data);
}

function normalizeSession(row: Record<string, any>): SessionRecord {
  return {
    id: row.id,
    pain_id: row.pain_id ?? null,
    started_by: row.started_by ?? null,
    status: row.status ?? "running",
    transcript: Array.isArray(row.transcript) ? (row.transcript as SessionMessage[]) : [],
    metadata: (row.metadata ?? {}) as Record<string, unknown>,
    created_at: row.created_at ?? new Date().toISOString(),
    completed_at: row.completed_at ?? null,
  };
}
