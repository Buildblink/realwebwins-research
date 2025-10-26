import { motion } from "framer-motion";

interface AgentBubbleProps {
  agent: string;
  role: "system" | "assistant" | "user";
  content: string;
  timestamp?: string;
}

const AGENT_META: Record<
  string,
  { gradient: string; accent: string; label: string; initial: string }
> = {
  agent_researcher: {
    gradient: "from-[#00ffe0]/35 to-transparent border-[#00ffe0]/40",
    accent: "#00ffe0",
    label: "Researcher",
    initial: "R",
  },
  agent_builder: {
    gradient: "from-[#6366f1]/35 to-transparent border-[#6366f1]/40",
    accent: "#6366f1",
    label: "Builder",
    initial: "B",
  },
  agent_validator: {
    gradient: "from-[#ffb300]/35 to-transparent border-[#ffb300]/40",
    accent: "#ffb300",
    label: "Validator",
    initial: "V",
  },
  user: {
    gradient: "from-white/10 to-transparent border-white/20",
    accent: "#d1d5db",
    label: "You",
    initial: "U",
  },
};

function normalizeAgent(agent: string, role: string) {
  const key = AGENT_META[agent] ? agent : role;
  const fallback = {
    gradient: "from-white/5 to-transparent border-white/10",
    accent: "#94a3b8",
    label: agent.replace(/_/g, " "),
    initial: agent.slice(0, 1).toUpperCase(),
  };
  return AGENT_META[key] ?? fallback;
}

export function AgentBubble({ agent, role, content, timestamp }: AgentBubbleProps) {
  const meta = normalizeAgent(agent, role);
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, ease: "easeOut" }}
      className={`rounded-2xl border bg-gradient-to-br ${meta.gradient} p-4 shadow-sm`}
    >
      <header className="mb-2 flex items-center justify-between text-xs uppercase tracking-wide text-zinc-400">
        <span className="flex items-center gap-2">
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold text-[#0f1117]"
            style={{ backgroundColor: meta.accent }}
          >
            {meta.initial}
          </span>
          {meta.label}
        </span>
        {timestamp ? <span>{new Date(timestamp).toLocaleTimeString()}</span> : null}
      </header>
      <p className="whitespace-pre-wrap text-sm text-zinc-100">{content}</p>
    </motion.div>
  );
}
