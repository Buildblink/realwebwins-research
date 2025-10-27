'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'

type DeployStatus = 'init' | 'pending' | 'pushed' | 'building' | 'live' | 'failed'

interface DeployWizardProps {
  mvpId: string
  onDeploy?: (config: DeployConfig) => Promise<void>
}

interface DeployConfig {
  repoName: string
  isPrivate: boolean
  addReadme: boolean
  addGitignore: boolean
  addLicense: boolean
  triggerVercel: boolean
  projectName?: string
}

export function DeployWizard({ mvpId, onDeploy }: DeployWizardProps) {
  const [config, setConfig] = useState<DeployConfig>({
    repoName: `realwebwins-mvp-${Date.now()}`,
    isPrivate: true,
    addReadme: true,
    addGitignore: true,
    addLicense: true,
    triggerVercel: false,
    projectName: '',
  })

  const [status, setStatus] = useState<DeployStatus>('init')
  const [githubConnected, setGithubConnected] = useState(false)
  const [vercelConnected, setVercelConnected] = useState(false)
  const [buildLog, setBuildLog] = useState<string[]>([])
  const [repoUrl, setRepoUrl] = useState<string>('')
  const [deployUrl, setDeployUrl] = useState<string>('')

  const handleDeploy = async () => {
    if (!githubConnected) {
      alert('Please connect GitHub first')
      return
    }

    setStatus('pending')
    setBuildLog([])

    try {
      // Simulate deploy process
      addLog('Validating code...')
      await sleep(500)
      addLog('✓ Code validation passed')

      addLog('Creating GitHub repository...')
      await sleep(1200)
      const mockRepoUrl = `https://github.com/you/${config.repoName}`
      setRepoUrl(mockRepoUrl)
      addLog(`✓ Repository created: ${mockRepoUrl}`)

      addLog('Pushing files (187 files)...')
      await sleep(3800)
      addLog('✓ Files pushed successfully')
      setStatus('pushed')

      if (config.triggerVercel && vercelConnected) {
        setStatus('building')
        addLog('Triggering Vercel build...')
        await sleep(2000)
        addLog('Vercel CLI 32.5.0')
        addLog(`🔗 Linked to you/${config.projectName || config.repoName}`)
        await sleep(1000)
        addLog('🔍 Inspect: https://vercel.com/you/project/12abc')
        addLog('⚡ Running "next build"')
        await sleep(5000)
        addLog('  ✓ Compiled successfully')
        addLog('  ✓ Linting and checking validity of types')
        addLog('  ✓ Creating an optimized production build')
        addLog('  ✓ Collecting page data')
        addLog('  ✓ Generating static pages (8/8)')
        await sleep(2000)

        const mockDeployUrl = `https://${config.repoName}.vercel.app`
        setDeployUrl(mockDeployUrl)
        addLog(`✓ Deployment complete: ${mockDeployUrl}`)
        setStatus('live')
      } else {
        setStatus('live')
      }

      // Call the onDeploy callback
      await onDeploy?.(config)
    } catch (error) {
      setStatus('failed')
      addLog(`✗ Deploy failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  const addLog = (message: string) => {
    setBuildLog((prev) => [...prev, message])
  }

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-2">🚀 Deploy MVP</h1>
        <p className="text-zinc-400">
          Deploy your MVP to GitHub and Vercel in one click
        </p>
      </div>

      {/* Step 1: Connect Providers */}
      <Section title="STEP 1: Connect Providers">
        <div className="space-y-3">
          <ProviderCard
            name="GitHub"
            connected={githubConnected}
            onConnect={() => setGithubConnected(true)}
            onDisconnect={() => setGithubConnected(false)}
            username={githubConnected ? '@john' : undefined}
          />
          <ProviderCard
            name="Vercel"
            connected={vercelConnected}
            onConnect={() => setVercelConnected(true)}
            onDisconnect={() => setVercelConnected(false)}
            username={vercelConnected ? '@john' : undefined}
            optional
          />
        </div>
      </Section>

      {/* Step 2: Repository Settings */}
      <Section title="STEP 2: Repository Settings">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Repository Name
            </label>
            <input
              type="text"
              value={config.repoName}
              onChange={(e) => setConfig({ ...config, repoName: e.target.value })}
              className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-[#00e5ff]/50"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-zinc-300 mb-2">
              Visibility
            </label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={config.isPrivate}
                  onChange={() => setConfig({ ...config, isPrivate: true })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-zinc-300">⚫ Private</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  checked={!config.isPrivate}
                  onChange={() => setConfig({ ...config, isPrivate: false })}
                  className="w-4 h-4"
                />
                <span className="text-sm text-zinc-300">⚪ Public</span>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Checkbox
              label="Add README with setup instructions"
              checked={config.addReadme}
              onChange={(checked) => setConfig({ ...config, addReadme: checked })}
            />
            <Checkbox
              label="Add .gitignore (Next.js)"
              checked={config.addGitignore}
              onChange={(checked) => setConfig({ ...config, addGitignore: checked })}
            />
            <Checkbox
              label="Add LICENSE (MIT)"
              checked={config.addLicense}
              onChange={(checked) => setConfig({ ...config, addLicense: checked })}
            />
            {vercelConnected && (
              <Checkbox
                label="Trigger Vercel deployment"
                checked={config.triggerVercel}
                onChange={(checked) => setConfig({ ...config, triggerVercel: checked })}
              />
            )}
          </div>
        </div>
      </Section>

      {/* Step 3: Deployment Status */}
      <Section title="STEP 3: Deployment Status">
        <div className="space-y-4">
          {/* Status Timeline */}
          <StatusTimeline status={status} />

          {/* Build Log */}
          {buildLog.length > 0 && (
            <div className="p-4 bg-black/50 border border-white/10 rounded-lg">
              <div className="text-xs font-mono space-y-1 text-zinc-300">
                {buildLog.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {status === 'live' && (
            <div className="p-4 bg-[#00ff94]/10 border border-[#00ff94]/30 rounded-lg">
              <div className="font-semibold text-[#00ff94] mb-2">
                ⚠️ NEXT STEPS AFTER DEPLOYMENT:
              </div>
              <ol className="text-sm text-zinc-300 space-y-1 list-decimal list-inside">
                <li>Add environment variables in Vercel dashboard</li>
                <li>Configure Supabase database connection</li>
                <li>Run database migrations</li>
                <li>Test authentication flow</li>
              </ol>
            </div>
          )}

          {/* Action Links */}
          {status === 'live' && (
            <div className="flex gap-3">
              {repoUrl && (
                <a
                  href={repoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-white/5 border border-white/20 rounded-lg text-sm font-medium hover:bg-white/10 transition"
                >
                  View Repository
                </a>
              )}
              {deployUrl && (
                <a
                  href={deployUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-[#00e5ff] text-[#060608] rounded-lg text-sm font-bold hover:bg-[#00e5ff]/90 transition"
                >
                  Open Live Site
                </a>
              )}
            </div>
          )}
        </div>
      </Section>

      {/* Deploy Button */}
      {status === 'init' && (
        <button
          onClick={handleDeploy}
          disabled={!githubConnected}
          className="w-full py-4 px-6 bg-[#00e5ff] text-[#060608] rounded-lg font-bold text-lg hover:bg-[#00e5ff]/90 transition disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
          style={{
            boxShadow: githubConnected ? '0 0 30px rgba(0, 229, 255, 0.4)' : 'none',
          }}
        >
          🚀 Deploy Now
        </button>
      )}
    </div>
  )
}

// Section Component
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="text-lg font-bold text-white mb-4">{title}</h2>
      {children}
    </div>
  )
}

// Provider Card
function ProviderCard({
  name,
  connected,
  onConnect,
  onDisconnect,
  username,
  optional = false,
}: {
  name: string
  connected: boolean
  onConnect: () => void
  onDisconnect: () => void
  username?: string
  optional?: boolean
}) {
  return (
    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-lg">
      <div className="flex items-center gap-3">
        <div className="text-2xl">
          {name === 'GitHub' ? '⚫' : name === 'Vercel' ? '▲' : '🔗'}
        </div>
        <div>
          <div className="font-semibold text-white">{name}</div>
          {connected && username && (
            <div className="text-sm text-zinc-400">Connected as {username}</div>
          )}
          {!connected && optional && (
            <div className="text-xs text-zinc-500">Optional</div>
          )}
        </div>
      </div>
      {connected ? (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#00ff94] text-sm font-medium">
            <span>✓</span>
            <span>Connected</span>
          </div>
          <button
            onClick={onDisconnect}
            className="px-3 py-1.5 bg-white/5 border border-white/20 rounded text-xs font-medium hover:bg-white/10 transition"
          >
            Disconnect
          </button>
        </div>
      ) : (
        <button
          onClick={onConnect}
          className="px-4 py-2 bg-[#00e5ff] text-[#060608] rounded-lg text-sm font-bold hover:bg-[#00e5ff]/90 transition"
        >
          Connect {name}
        </button>
      )}
    </div>
  )
}

// Checkbox Component
function Checkbox({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (checked: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-4 h-4"
      />
      <span className="text-sm text-zinc-300">{label}</span>
    </label>
  )
}

// Status Timeline
function StatusTimeline({ status }: { status: DeployStatus }) {
  const steps = [
    { id: 'init', label: 'Initialize', icon: '⚪' },
    { id: 'pending', label: 'Pending', icon: '🔄' },
    { id: 'pushed', label: 'Pushed', icon: '✓' },
    { id: 'building', label: 'Building', icon: '🔧' },
    { id: 'live', label: 'Live', icon: '🎉' },
  ]

  const statusIndex = steps.findIndex((s) => s.id === status)

  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isActive = index === statusIndex
        const isComplete = index < statusIndex
        const isFailed = status === 'failed' && index === statusIndex

        return (
          <div key={step.id} className="flex items-center">
            <div
              className={`
                w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all
                ${isComplete
                  ? 'bg-[#00ff94] text-[#060608]'
                  : isActive && !isFailed
                  ? 'bg-[#00e5ff] text-[#060608] animate-pulse'
                  : isFailed
                  ? 'bg-red-500 text-white'
                  : 'bg-white/5 text-zinc-500'
                }
              `}
            >
              {step.icon}
            </div>
            {index < steps.length - 1 && (
              <div
                className={`w-12 h-1 mx-2 ${
                  isComplete ? 'bg-[#00ff94]' : 'bg-white/10'
                }`}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}
