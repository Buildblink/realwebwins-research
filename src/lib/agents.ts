interface RelayMessageParams {
  conversationId?: string;
  senderAgent: string;
  receiverAgent?: string;
  content: string;
  apiBaseOverride?: string;
}

const DEFAULT_RECEIVER = "agent_alpha";

function resolveApiBase(override?: string): string {
  if (override) {
    return override.replace(/\/$/, "");
  }

  const configured =
    process.env.NEXT_PUBLIC_API_BASE ??
    process.env.API_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const vercel = process.env.VERCEL_URL;
  if (vercel) {
    return `https://${vercel.replace(/\/$/, "")}`;
  }

  return "http://localhost:3000";
}

export async function relayMessage({
  conversationId,
  senderAgent,
  receiverAgent,
  content,
  apiBaseOverride,
}: RelayMessageParams): Promise<string> {
  const apiBase = resolveApiBase(apiBaseOverride);
  const response = await fetch(`${apiBase}/api/agents/relay`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      conversation_id: conversationId,
      sender_agent: senderAgent,
      receiver_agent: receiverAgent ?? DEFAULT_RECEIVER,
      content,
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `[relayMessage] Relay call failed (${response.status}): ${body}`
    );
  }

  const json = (await response.json().catch(() => ({}))) as {
    reply?: string;
  };

  return json.reply ?? "";
}
