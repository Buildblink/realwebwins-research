interface AgentBubbleProps {
  agent: string;
  role: "system" | "assistant" | "user";
  content: string;
  timestamp?: string;
}

const COLORS: Record<string, string> = {
  agent_researcher: "from-[#00ffe0]/30 to-transparent border-[#00ffe0]/40",
  agent_builder: "from-[#6366f1]/30 to-transparent border-[#6366f1]/40",
  agent_validator: "from-[#ffb300]/30 to-transparent border-[#ffb300]/40",
  user: "from-white/10 to-transparent border-white/20",
};

export function AgentBubble({ agent, role, content, timestamp }: AgentBubbleProps) {
  const color = COLORS[agent] ?? COLORS[role] ?? "from-white/5 to-transparent border-white/10";
  return (
    <div className={`rounded-2xl border bg-gradient-to-br ${color} p-4 shadow-sm`}>
      <header className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-zinc-400">
        <span>{agent.replace(/_/g, " ")}</span>
        {timestamp ? <span>{new Date(timestamp).toLocaleTimeString()}</span> : null}
      </header>
      <p className="whitespace-pre-wrap text-sm text-zinc-100">{content}</p>
    </div>
  );
}
