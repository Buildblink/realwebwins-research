'use client'

import { useState } from 'react'

interface Artifact {
  id: string
  name: string
  type: 'code' | 'schema' | 'landing' | 'roadmap' | 'other'
  fileCount: number
  size: string
  tier: 'free' | 'pro' | 'premium'
  validated: boolean
}

interface ValidationStatus {
  typescript: boolean
  sql: boolean
  warnings: number
  errors: number
}

interface MVPOutput {
  title: string
  score: number
  stack: string
  pricing: string
}

interface DeliverablesPanelProps {
  artifacts?: Artifact[]
  validation?: ValidationStatus
  mvpOutput?: MVPOutput
  techStack?: string[]
  estimatedTime?: string
  tier?: 'free' | 'pro' | 'premium'
  onDownload?: (artifactId: string) => void
  onDeploy?: () => void
  onPreview?: () => void
}

export function DeliverablesPanel({
  artifacts = [],
  validation,
  mvpOutput,
  techStack = [],
  estimatedTime,
  tier = 'free',
  onDownload,
  onDeploy,
  onPreview,
}: DeliverablesPanelProps) {
  const [selectedArtifacts, setSelectedArtifacts] = useState<string[]>([])

  const toggleArtifact = (id: string) => {
    setSelectedArtifacts((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id]
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Deliverables Section */}
      <Section title="📦 Deliverables">
        <div className="space-y-2">
          {artifacts.map((artifact) => (
            <ArtifactCheckbox
              key={artifact.id}
              artifact={artifact}
              checked={selectedArtifacts.includes(artifact.id)}
              onToggle={() => toggleArtifact(artifact.id)}
              userTier={tier}
            />
          ))}

          {artifacts.length === 0 && (
            <div className="text-center py-6 text-zinc-500 text-sm">
              No artifacts generated yet
            </div>
          )}
        </div>

        {/* Estimated Time */}
        {estimatedTime && (
          <div className="mt-4 p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Estimated Time</span>
              <span className="font-semibold text-white">{estimatedTime}</span>
            </div>
          </div>
        )}

        {/* Tier Badge */}
        {tier && (
          <div className="mt-2 p-3 bg-white/5 rounded-lg border border-white/10">
            <div className="flex items-center justify-between text-sm">
              <span className="text-zinc-400">Your Tier</span>
              <TierBadge tier={tier} />
            </div>
          </div>
        )}
      </Section>

      {/* Validation Section */}
      {validation && (
        <Section title="✓ Validation">
          <div className="space-y-2">
            <ValidationItem
              label="TypeScript"
              status={validation.typescript}
              icon="📘"
            />
            <ValidationItem
              label="SQL Valid"
              status={validation.sql}
              icon="🗄️"
            />
            {validation.warnings > 0 && (
              <ValidationItem
                label={`${validation.warnings} Warnings`}
                status={false}
                icon="⚠️"
                warning
              />
            )}
            {validation.errors > 0 && (
              <ValidationItem
                label={`${validation.errors} Errors`}
                status={false}
                icon="❌"
              />
            )}
          </div>
        </Section>
      )}

      {/* MVP Output Section */}
      {mvpOutput && (
        <Section title="🎯 MVP Output">
          <div className="space-y-3">
            <div>
              <div className="text-xs text-zinc-400 mb-1">Title</div>
              <div className="text-sm font-semibold text-white">
                {mvpOutput.title}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-1">Validation Score</div>
              <div className="flex items-center gap-2">
                <div className="text-2xl font-bold text-white">
                  {mvpOutput.score}
                </div>
                {mvpOutput.score >= 8 && <span className="text-lg">🔥</span>}
              </div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-1">Stack</div>
              <div className="text-sm text-zinc-200">{mvpOutput.stack}</div>
            </div>
            <div>
              <div className="text-xs text-zinc-400 mb-1">Pricing</div>
              <div className="text-sm text-zinc-200">{mvpOutput.pricing}</div>
            </div>
          </div>
        </Section>
      )}

      {/* Tech Stack Section */}
      {techStack.length > 0 && (
        <Section title="🔧 Tech Stack">
          <div className="flex flex-wrap gap-2">
            {techStack.map((tech) => (
              <span
                key={tech}
                className="px-2 py-1 bg-white/5 border border-white/10 rounded text-xs text-zinc-300"
              >
                {tech}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Action Buttons */}
      <div className="space-y-2">
        <button
          onClick={onDeploy}
          className="w-full py-3 px-4 bg-[#00e5ff] text-[#060608] rounded-lg font-bold text-sm hover:bg-[#00e5ff]/90 transition shadow-lg"
          style={{
            boxShadow: '0 0 20px rgba(0, 229, 255, 0.3)',
          }}
        >
          🚀 Deploy Now
        </button>

        <button
          onClick={onPreview}
          className="w-full py-3 px-4 bg-white/5 border border-white/20 text-white rounded-lg font-semibold text-sm hover:bg-white/10 transition"
        >
          👁️ Preview Files
        </button>

        <button
          onClick={() => selectedArtifacts.forEach((id) => onDownload?.(id))}
          disabled={selectedArtifacts.length === 0}
          className="w-full py-3 px-4 bg-white/5 border border-white/10 text-white rounded-lg font-semibold text-sm hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ⬇️ Download Selected ({selectedArtifacts.length})
        </button>
      </div>
    </div>
  )
}

// Section Component
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-sm font-bold text-white mb-3">{title}</h3>
      {children}
    </div>
  )
}

// Artifact Checkbox Component
function ArtifactCheckbox({
  artifact,
  checked,
  onToggle,
  userTier,
}: {
  artifact: Artifact
  checked: boolean
  onToggle: () => void
  userTier: 'free' | 'pro' | 'premium'
}) {
  const tierLevels = { free: 0, pro: 1, premium: 2 }
  const isLocked = tierLevels[artifact.tier] > tierLevels[userTier]

  const typeIcons = {
    code: '💻',
    schema: '🏗️',
    landing: '📄',
    roadmap: '📊',
    other: '📦',
  }

  return (
    <label
      className={`
        flex items-center gap-3 p-3 rounded-lg border transition-all cursor-pointer
        ${checked
          ? 'bg-white/10 border-[#00e5ff]/50'
          : 'bg-white/5 border-white/10 hover:border-white/20'
        }
        ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        disabled={isLocked}
        className="w-4 h-4"
      />

      <div className="flex-1">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-base">{typeIcons[artifact.type]}</span>
          <span className="text-sm font-semibold text-white">{artifact.name}</span>
          {isLocked && <span className="text-xs">🔒</span>}
          {artifact.validated && <span className="text-xs text-[#00ff94]">✓</span>}
        </div>
        <div className="flex items-center gap-3 text-xs text-zinc-400">
          <span>{artifact.fileCount} files</span>
          <span>{artifact.size}</span>
          {isLocked && <TierBadge tier={artifact.tier} />}
        </div>
      </div>
    </label>
  )
}

// Validation Item Component
function ValidationItem({
  label,
  status,
  icon,
  warning = false,
}: {
  label: string
  status: boolean
  icon: string
  warning?: boolean
}) {
  return (
    <div className="flex items-center gap-2 text-sm">
      <span>{icon}</span>
      <span
        className={`flex-1 ${
          status ? 'text-[#00ff94]' : warning ? 'text-yellow-500' : 'text-red-500'
        }`}
      >
        {label}
      </span>
      {status && <span className="text-[#00ff94]">✓</span>}
    </div>
  )
}

// Tier Badge Component
function TierBadge({ tier }: { tier: 'free' | 'pro' | 'premium' }) {
  const colors = {
    free: 'text-[#00ff94] bg-[#00ff94]/20 border-[#00ff94]/50',
    pro: 'text-[#00e5ff] bg-[#00e5ff]/20 border-[#00e5ff]/50',
    premium: 'text-[#b24bf3] bg-[#b24bf3]/20 border-[#b24bf3]/50',
  }

  return (
    <span
      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${colors[tier]}`}
    >
      {tier}
    </span>
  )
}
