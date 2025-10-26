"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { AgentBubble } from "@/components/agents/AgentBubble";
import type { SessionMessage } from "@/lib/agents/sessions";

interface ChatPanelProps {
  transcript: SessionMessage[];
  isTyping?: boolean;
}

export function ChatPanel({ transcript, isTyping = false }: ChatPanelProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript, isTyping]);

  return (
    <div className="flex h-[420px] flex-col gap-3 overflow-y-auto rounded-2xl border border-white/10 bg-white/5 p-4">
      {transcript.length === 0 ? (
        <p className="text-sm text-zinc-400">
          Agents are warming up. Start the session to watch the collaboration unfold.
        </p>
      ) : (
        transcript.map((message) => (
          <AgentBubble
            key={message.id}
            agent={message.agent}
            role={message.role}
            content={message.content}
            timestamp={message.created_at}
          />
        ))
      )}

      {isTyping ? (
        <motion.div
          initial={{ opacity: 0.2 }}
          animate={{ opacity: 1 }}
          transition={{ repeat: Infinity, duration: 1, ease: "easeInOut" }}
          className="flex items-center gap-2 self-start rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs text-zinc-200"
        >
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#00ffe0]" />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#6366f1]" style={{ animationDelay: "0.1s" }} />
            <span className="h-2 w-2 animate-bounce rounded-full bg-[#ffb300]" style={{ animationDelay: "0.2s" }} />
          </span>
          Agents are thinking…
        </motion.div>
      ) : null}
      <div ref={endRef} />
    </div>
  );
}
