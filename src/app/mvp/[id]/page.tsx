'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { WorkspaceLayout } from '@/components/workspace/WorkspaceLayout'
import { ModeTabs } from '@/components/workspace/ModeTabs'
import { ChatTheater, type Agent, type AgentMessage } from '@/components/workspace/ChatTheater'
import { DeliverablesPanel } from '@/components/workspace/DeliverablesPanel'
import { FileTreeViewer, type FileNode } from '@/components/workspace/FileTreeViewer'
import { CodeViewer } from '@/components/workspace/CodeViewer'
import { DeployWizard } from '@/components/workspace/DeployWizard'
import { Menu, X, Home, Search, BookOpen } from 'lucide-react'

type Mode = 'generate' | 'preview' | 'deploy'

interface MVPPageProps {
  params: { id: string }
}

export default function MVPWorkspacePage({ params }: MVPPageProps) {
  const router = useRouter()
  const [mode, setMode] = useState<Mode>('generate')
  const [isGenerating, setIsGenerating] = useState(false)
  const [showQuickNav, setShowQuickNav] = useState(false)
  const [agents, setAgents] = useState<Agent[]>([
    { id: 'researcher', name: 'Researcher', role: 'researcher', icon: '🔬', color: '#00e5ff', status: 'idle' },
    { id: 'architect', name: 'Architect', role: 'architect', icon: '🏗️', color: '#00ff94', status: 'idle' },
    { id: 'coder', name: 'Coder', role: 'coder', icon: '💻', color: '#b24bf3', status: 'idle' },
    { id: 'copywriter', name: 'Copywriter', role: 'copywriter', icon: '✍️', color: '#ffb300', status: 'idle' },
    { id: 'strategist', name: 'Strategist', role: 'strategist', icon: '📊', color: '#ff6b6b', status: 'idle' },
    { id: 'builder', name: 'Builder', role: 'builder', icon: '👷', color: '#4f46e5', status: 'idle' },
    { id: 'validator', name: 'Validator', role: 'validator', icon: '✅', color: '#10b981', status: 'idle' },
  ])
  const [messages, setMessages] = useState<AgentMessage[]>([])
  const [progress, setProgress] = useState({ current: 0, total: 7, percentage: 0 })

  // Preview mode state
  const [selectedFile, setSelectedFile] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')
  const [fileContent, setFileContent] = useState<string>('')
  const [projectFiles, setProjectFiles] = useState<Record<string, any>>({})

  // Fetch MVP data
  useEffect(() => {
    const fetchMVPData = async () => {
      try {
        const response = await fetch(`/api/mvp/${params.id}/project`)
        if (response.ok) {
          const data = await response.json()
          setProjectFiles(data.files || {})
        }
      } catch (error) {
        console.error('Failed to fetch MVP data:', error)
      }
    }

    fetchMVPData()
  }, [params.id])

  // Convert project files to FileNode tree
  const fileTree = useMemo(() => {
    const tree: FileNode[] = []
    const folders = new Map<string, FileNode>()

    Object.entries(projectFiles).forEach(([path, fileData]: [string, any]) => {
      const parts = path.split('/')
      const fileName = parts[parts.length - 1]

      // Build folder structure
      let currentPath = ''
      for (let i = 0; i < parts.length - 1; i++) {
        const folderName = parts[i]
        currentPath = currentPath ? `${currentPath}/${folderName}` : folderName

        if (!folders.has(currentPath)) {
          const folder: FileNode = {
            name: folderName,
            path: currentPath,
            type: 'folder',
            children: []
          }
          folders.set(currentPath, folder)

          // Add to parent or root
          if (i === 0) {
            tree.push(folder)
          } else {
            const parentPath = parts.slice(0, i).join('/')
            const parent = folders.get(parentPath)
            parent?.children?.push(folder)
          }
        }
      }

      // Add file to its parent folder or root
      const file: FileNode = {
        name: fileName,
        path,
        type: 'file',
        size: fileData.size ? `${(fileData.size / 1024).toFixed(1)} KB` : undefined,
        tier: fileData.tier || 'free'
      }

      if (parts.length === 1) {
        tree.push(file)
      } else {
        const parentPath = parts.slice(0, -1).join('/')
        const parent = folders.get(parentPath)
        parent?.children?.push(file)
      }
    })

    return tree
  }, [projectFiles])

  // SSE connection for generation streaming
  useEffect(() => {
    if (mode !== 'generate' || !isGenerating) return

    const eventSource = new EventSource(`/api/mvp/generate?pain_id=${params.id}&stream=true`)

    eventSource.addEventListener('start', () => {
      setMessages([])
      setProgress({ current: 0, total: 7, percentage: 0 })
    })

    eventSource.addEventListener('message', (e) => {
      try {
        const data = JSON.parse(e.data)

        // Update agent status
        setAgents((prev) =>
          prev.map((agent) =>
            agent.name.toLowerCase() === data.agent.toLowerCase()
              ? { ...agent, status: 'speaking' as const }
              : agent
          )
        )

        // Add message
        const message: AgentMessage = {
          id: crypto.randomUUID(),
          agentId: data.agent.toLowerCase(),
          agentName: data.agent,
          content: data.output,
          timestamp: new Date().toISOString(),
          thinkingTime: data.durationMs,
          confidence: data.success ? 0.85 : 0.5,
        }
        setMessages((prev) => [...prev, message])

        // Update progress
        setProgress((prev) => ({
          ...prev,
          current: prev.current + 1,
          percentage: Math.round(((prev.current + 1) / prev.total) * 100)
        }))

        // Mark agent as complete after a delay
        setTimeout(() => {
          setAgents((prev) =>
            prev.map((agent) =>
              agent.name.toLowerCase() === data.agent.toLowerCase()
                ? { ...agent, status: 'complete' as const }
                : agent
            )
          )
        }, 1500)
      } catch (error) {
        console.error('Failed to parse SSE message:', error)
      }
    })

    eventSource.addEventListener('complete', (e) => {
      try {
        const data = JSON.parse(e.data)
        console.log('Generation complete:', data)
        setIsGenerating(false)
        router.refresh()
      } catch (error) {
        console.error('Failed to parse complete event:', error)
      }
    })

    eventSource.addEventListener('error', (e: any) => {
      console.error('SSE error:', e)
      setIsGenerating(false)
      eventSource.close()
    })

    return () => {
      eventSource.close()
    }
  }, [mode, isGenerating, params.id, router])

  // Handle file selection in preview mode
  useEffect(() => {
    if (mode === 'preview' && selectedFile && projectFiles[selectedFile]) {
      const file = projectFiles[selectedFile]
      setFileContent(file.preview || file.content || '')
    }
  }, [selectedFile, projectFiles, mode])

  const renderMainContent = () => {
    switch (mode) {
      case 'generate':
        return (
          <div className="h-full p-6">
            <ChatTheater
              agents={agents}
              messages={messages}
              progress={progress}
              onPause={() => setIsGenerating(false)}
              onRefresh={() => {
                setIsGenerating(true)
                setMessages([])
                setAgents(prev => prev.map(a => ({ ...a, status: 'idle' })))
              }}
              onInject={() => {
                // TODO: Implement user intervention
                console.log('User intervention requested')
              }}
            />
          </div>
        )

      case 'preview':
        return (
          <div className="flex h-full">
            <div className="w-80 border-r border-white/10 bg-[#111113]">
              <FileTreeViewer
                files={fileTree}
                selectedFile={selectedFile}
                onSelectFile={setSelectedFile}
                searchQuery={searchQuery}
                onSearch={setSearchQuery}
              />
            </div>
            <div className="flex-1">
              {selectedFile ? (
                <CodeViewer
                  filename={selectedFile.split('/').pop() || ''}
                  language={inferLanguage(selectedFile)}
                  code={fileContent}
                  onCopy={() => console.log('Copied')}
                  onDownload={() => downloadFile(selectedFile, fileContent)}
                  onShare={() => console.log('Share')}
                />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500">
                  Select a file to preview
                </div>
              )}
            </div>
          </div>
        )

      case 'deploy':
        return (
          <div className="h-full overflow-auto">
            <DeployWizard
              mvpId={params.id}
              onDeploy={async (config) => {
                console.log('Deploying with config:', config)
                // The DeployWizard handles the deploy API call internally
              }}
            />
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className="h-screen flex flex-col bg-[#060608]">
      {/* Quick Nav Button */}
      <button
        onClick={() => setShowQuickNav(true)}
        className="fixed right-6 top-20 z-50 w-12 h-12 rounded-xl bg-panel border border-subtle flex items-center justify-center hover:bg-panel-hover transition-colors shadow-lg"
        title="Quick Navigation"
      >
        <Menu className="w-5 h-5 text-foreground-dim" />
      </button>

      {/* Quick Nav Slide-over */}
      {showQuickNav && (
        <>
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
            onClick={() => setShowQuickNav(false)}
          />
          <div className="fixed right-0 top-0 bottom-0 w-80 bg-panel border-l border-subtle z-50 p-6 overflow-y-auto animate-slide-in-right">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Quick Navigation</h2>
              <button
                onClick={() => setShowQuickNav(false)}
                className="p-2 rounded-lg hover:bg-bg transition-colors"
              >
                <X className="w-5 h-5 text-foreground-dim" />
              </button>
            </div>

            <div className="space-y-2">
              <Link
                href="/dashboard"
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-bg transition-colors"
              >
                <Home className="w-5 h-5 text-foreground-dim" />
                <span className="text-foreground">Dashboard</span>
              </Link>
              <Link
                href="/research/browse"
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-bg transition-colors"
              >
                <Search className="w-5 h-5 text-foreground-dim" />
                <span className="text-foreground">Browse Research</span>
              </Link>
              <Link
                href="/docs"
                className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-bg transition-colors"
              >
                <BookOpen className="w-5 h-5 text-foreground-dim" />
                <span className="text-foreground">Documentation</span>
              </Link>
            </div>

            <div className="mt-8 p-4 bg-bg border border-subtle rounded-xl">
              <p className="text-xs text-foreground-muted">
                💡 Tip: Use this menu to quickly navigate while working in the workspace
              </p>
            </div>
          </div>
        </>
      )}

      {/* Mode Tabs */}
      <ModeTabs
        mvpId={params.id}
        currentMode={mode}
        onModeChange={(newMode) => setMode(newMode as Mode)}
      />

      {/* Main Workspace Layout */}
      <WorkspaceLayout
        sidebar={
          <div className="p-6 space-y-4">
            <div>
              <h2 className="text-xs font-semibold uppercase tracking-[0.3em] text-[#00e5ff] mb-3">
                MVP Session
              </h2>
              <p className="text-sm text-zinc-400">
                Session ID: <span className="text-zinc-300 font-mono">{params.id.slice(0, 8)}</span>
              </p>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 mb-3">
                Quick Actions
              </h3>
              <div className="space-y-2">
                <button
                  onClick={() => setMode('generate')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 transition"
                >
                  🔄 View Generation
                </button>
                <button
                  onClick={() => setMode('preview')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 transition"
                >
                  👁️ Preview Files
                </button>
                <button
                  onClick={() => setMode('deploy')}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm bg-white/5 hover:bg-white/10 transition"
                >
                  🚀 Deploy Now
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-white/10">
              <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500 mb-3">
                Status
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Mode</span>
                  <span className="text-white font-medium capitalize">{mode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Progress</span>
                  <span className="text-white font-medium">{progress.percentage}%</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Files</span>
                  <span className="text-white font-medium">{Object.keys(projectFiles).length}</span>
                </div>
              </div>
            </div>
          </div>
        }
        main={renderMainContent()}
        panel={
          <div className="p-6">
            <DeliverablesPanel
              artifacts={[
                {
                  id: '1',
                  name: 'Full Code Package',
                  type: 'code',
                  fileCount: Object.keys(projectFiles).length,
                  size: calculateTotalSize(projectFiles),
                  tier: 'pro',
                  validated: true,
                },
                {
                  id: '2',
                  name: 'Landing Page',
                  type: 'landing',
                  fileCount: 1,
                  size: '4.2 KB',
                  tier: 'free',
                  validated: true,
                },
                {
                  id: '3',
                  name: 'Database Schema',
                  type: 'schema',
                  fileCount: 3,
                  size: '2.1 KB',
                  tier: 'free',
                  validated: true,
                },
              ]}
              validation={{
                typescript: true,
                sql: true,
                warnings: 0,
                errors: 0,
              }}
              mvpOutput={{
                title: 'AI-Generated MVP',
                score: 8.5,
                stack: 'Next.js + Supabase + Tailwind',
                pricing: '$49/mo',
              }}
              techStack={['Next.js', 'TypeScript', 'Supabase', 'Tailwind CSS', 'Resend']}
              estimatedTime="2-3 hours"
              tier="pro"
              onDownload={(artifactId) => {
                console.log('Download artifact:', artifactId)
                window.open(`/api/export/mvp/${params.id}`, '_blank')
              }}
              onDeploy={() => setMode('deploy')}
              onPreview={() => setMode('preview')}
            />
          </div>
        }
        footer={
          <div className="px-6 py-3 text-sm text-zinc-400 border-t border-white/10">
            💡 Tip: {mode === 'generate' && 'Click any agent to see their detailed thinking process'}
            {mode === 'preview' && 'Use Cmd/Ctrl + K to search files quickly'}
            {mode === 'deploy' && 'Connect GitHub to deploy your MVP in one click'}
          </div>
        }
      />
    </div>
  )
}

// Helper functions
function inferLanguage(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  const langMap: Record<string, string> = {
    'ts': 'typescript',
    'tsx': 'typescript',
    'js': 'javascript',
    'jsx': 'javascript',
    'json': 'json',
    'md': 'markdown',
    'css': 'css',
    'html': 'html',
    'sql': 'sql',
    'yml': 'yaml',
    'yaml': 'yaml',
  }
  return langMap[ext || ''] || 'text'
}

function downloadFile(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function calculateTotalSize(files: Record<string, any>): string {
  const totalBytes = Object.values(files).reduce((sum, file: any) => {
    return sum + (file.size || 0)
  }, 0)
  const kb = totalBytes / 1024
  return kb > 1024 ? `${(kb / 1024).toFixed(1)} MB` : `${kb.toFixed(1)} KB`
}
