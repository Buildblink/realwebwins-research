'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { ReactNode } from 'react'

export type AgentStatus = 'idle' | 'thinking' | 'speaking' | 'complete' | 'error'

export interface Agent {
  id: string
  name: string
  role: string
  icon: string
  color: string
  status: AgentStatus
}

export interface AgentMessage {
  id: string
  agentId: string
  agentName: string
  content: string
  timestamp: string
  thinkingTime?: number
  confidence?: number
}

interface ChatTheaterProps {
  agents: Agent[]
  messages: AgentMessage[]
  progress?: {
    current: number
    total: number
    percentage: number
  }
  onPause?: () => void
  onRefresh?: () => void
  onInject?: () => void
}

export function ChatTheater({
  agents,
  messages,
  progress,
  onPause,
  onRefresh,
  onInject,
}: ChatTheaterProps) {
  return (
    <div className="flex flex-col h-full bg-[#111113] rounded-2xl border border-white/10">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🎭</span>
          <h2 className="text-lg font-bold text-white">Chat Theater</h2>
          <span className="text-sm text-zinc-400">(Agent Collaboration)</span>
        </div>
        {progress && (
          <div className="text-sm text-zinc-400">
            {progress.current}/{progress.total} agents complete
          </div>
        )}
      </div>

      {/* Agent Grid */}
      <div className="px-6 py-6 border-b border-white/10">
        <div className="grid grid-cols-4 gap-4">
          {agents.slice(0, 7).map((agent) => (
            <AgentAvatar key={agent.id} agent={agent} />
          ))}
        </div>
      </div>

      {/* Conversation Stream */}
      <div className="flex-1 overflow-y-auto px-6 py-4">
        <div className="space-y-3">
          <AnimatePresence mode="popLayout">
            {messages.map((message) => {
              const agent = agents.find(a => a.id === message.agentId)
              return (
                <MessageBubble
                  key={message.id}
                  message={message}
                  agentColor={agent?.color || '#6b7280'}
                  agentIcon={agent?.icon || '🤖'}
                />
              )
            })}
          </AnimatePresence>

          {messages.length === 0 && (
            <div className="text-center py-12 text-zinc-500">
              <div className="text-4xl mb-2">🎭</div>
              <div>Waiting for agents to start...</div>
            </div>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      {progress && (
        <div className="px-6 py-3 border-t border-white/10">
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-[#00e5ff] to-[#b24bf3]"
                initial={{ width: 0 }}
                animate={{ width: `${progress.percentage}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
            <div className="text-sm font-medium text-white">
              {progress.percentage}%
            </div>
          </div>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center gap-2 px-6 py-4 border-t border-white/10">
        <button
          onClick={onPause}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition"
        >
          <span>⏸️</span>
          <span>Pause</span>
        </button>
        <button
          onClick={onRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition"
        >
          <span>🔄</span>
          <span>Refresh</span>
        </button>
        <button
          onClick={onInject}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition"
        >
          <span>💬</span>
          <span>Inject Prompt</span>
        </button>
      </div>
    </div>
  )
}

// Agent Avatar Component
function AgentAvatar({ agent }: { agent: Agent }) {
  const statusStyles = {
    idle: 'opacity-60',
    thinking: 'animate-pulse opacity-100',
    speaking: 'scale-110 opacity-100',
    complete: 'opacity-80',
    error: 'opacity-50',
  }

  const statusIndicators = {
    idle: null,
    thinking: (
      <div className="absolute -bottom-1 flex gap-1">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            className="w-1.5 h-1.5 bg-zinc-400 rounded-full"
            animate={{ y: [0, -4, 0] }}
            transition={{
              duration: 0.6,
              repeat: Infinity,
              delay: i * 0.2,
            }}
          />
        ))}
      </div>
    ),
    speaking: (
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#00ff94] rounded-full flex items-center justify-center">
        <span className="text-xs">💬</span>
      </div>
    ),
    complete: (
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#00ff94] rounded-full flex items-center justify-center">
        <span className="text-xs">✓</span>
      </div>
    ),
    error: (
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
        <span className="text-xs">✗</span>
      </div>
    ),
  }

  return (
    <motion.div
      className={`relative flex flex-col items-center gap-2 transition-all ${statusStyles[agent.status]}`}
      whileHover={{ scale: 1.05 }}
    >
      {/* Avatar Circle */}
      <div
        className="relative w-16 h-16 rounded-full flex items-center justify-center text-2xl shadow-lg transition-all"
        style={{
          backgroundColor: agent.status === 'speaking' ? agent.color : `${agent.color}33`,
          border: `2px solid ${agent.color}`,
          boxShadow: agent.status === 'speaking' ? `0 0 20px ${agent.color}80` : 'none',
        }}
      >
        {agent.icon}
      </div>

      {/* Status Indicator */}
      {statusIndicators[agent.status]}

      {/* Agent Name */}
      <div className="text-center">
        <div className="text-xs font-semibold text-white">{agent.name}</div>
        <div className="text-[10px] text-zinc-500">{agent.role}</div>
      </div>
    </motion.div>
  )
}

// Message Bubble Component
function MessageBubble({
  message,
  agentColor,
  agentIcon,
}: {
  message: AgentMessage
  agentColor: string
  agentIcon: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.8 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.3 }}
      className="relative p-4 rounded-lg shadow-md"
      style={{
        backgroundColor: `${agentColor}10`,
        border: `1px solid ${agentColor}30`,
      }}
    >
      {/* Agent Badge */}
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center text-sm"
          style={{
            backgroundColor: `${agentColor}33`,
            border: `1px solid ${agentColor}`,
          }}
        >
          {agentIcon}
        </div>
        <div className="text-xs font-semibold" style={{ color: agentColor }}>
          {message.agentName}
        </div>
      </div>

      {/* Message Content */}
      <div className="text-sm leading-relaxed text-zinc-200">
        {message.content}
      </div>

      {/* Metadata */}
      {(message.thinkingTime || message.confidence) && (
        <div className="flex items-center gap-3 mt-2 text-xs text-zinc-500">
          {message.thinkingTime && (
            <span>⏱️ {(message.thinkingTime / 1000).toFixed(1)}s</span>
          )}
          {message.confidence && (
            <span>✓ {(message.confidence * 100).toFixed(0)}% confident</span>
          )}
        </div>
      )}
    </motion.div>
  )
}
