"use client";

import { useEffect, useRef } from "react";
import { AgentBubble } from "@/components/agents/AgentBubble";
import type { SessionMessage } from "@/lib/agents/sessions";

interface ChatPanelProps {
  transcript: SessionMessage[];
}

export function ChatPanel({ transcript }: ChatPanelProps) {
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [transcript]);

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
      <div ref={endRef} />
    </div>
  );
}
