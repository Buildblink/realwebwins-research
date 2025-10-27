'use client'

import { useState } from 'react'

interface CodeViewerProps {
  filename: string
  language: string
  code: string
  onCopy?: () => void
  onDownload?: () => void
  onShare?: () => void
}

export function CodeViewer({
  filename,
  language,
  code,
  onCopy,
  onDownload,
  onShare,
}: CodeViewerProps) {
  const [activeTab, setActiveTab] = useState<'code' | 'preview' | 'diff'>('code')
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    onCopy?.()
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex flex-col h-full bg-[#111113] rounded-2xl border border-white/10">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm">
          <span className="text-zinc-500">src</span>
          <span className="text-zinc-500">/</span>
          <span className="text-zinc-500">app</span>
          <span className="text-zinc-500">/</span>
          <span className="text-white font-medium">{filename}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition"
          >
            <span>{copied ? '✓' : '📋'}</span>
            <span>{copied ? 'Copied!' : 'Copy'}</span>
          </button>
          <button
            onClick={onDownload}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition"
          >
            <span>⬇️</span>
            <span>Download</span>
          </button>
          <button
            onClick={onShare}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-medium transition"
          >
            <span>🔗</span>
            <span>Share</span>
          </button>
        </div>
      </div>

      {/* Code Content */}
      <div className="flex-1 overflow-auto p-6">
        <pre className="text-sm leading-relaxed">
          <code className={`language-${language}`}>
            {code}
          </code>
        </pre>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-6 py-2 border-t border-white/10">
        <TabButton
          label="Code"
          active={activeTab === 'code'}
          onClick={() => setActiveTab('code')}
        />
        <TabButton
          label="Preview"
          active={activeTab === 'preview'}
          onClick={() => setActiveTab('preview')}
        />
        <TabButton
          label="Diff"
          active={activeTab === 'diff'}
          onClick={() => setActiveTab('diff')}
        />
      </div>
    </div>
  )
}

function TabButton({
  label,
  active,
  onClick,
}: {
  label: string
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className={`
        px-3 py-1.5 rounded text-xs font-medium transition-all
        ${active
          ? 'bg-white/10 text-white'
          : 'text-zinc-400 hover:text-white hover:bg-white/5'
        }
      `}
    >
      {label}
    </button>
  )
}
