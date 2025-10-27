'use client'

import { usePathname, useRouter } from 'next/navigation'

interface ModeTab {
  id: string
  label: string
  icon: string
  path: string
}

interface ModeTabsProps {
  mvpId?: string
  currentMode?: 'generate' | 'preview' | 'deploy'
  onModeChange?: (mode: 'generate' | 'preview' | 'deploy') => void
}

export function ModeTabs({ mvpId, currentMode = 'generate', onModeChange }: ModeTabsProps) {
  const router = useRouter()
  const pathname = usePathname()

  const tabs: ModeTab[] = [
    { id: 'generate', label: 'Generate', icon: '✨', path: '/studio' },
    { id: 'preview', label: 'Preview', icon: '👁️', path: mvpId ? `/mvp/${mvpId}/preview` : '#' },
    { id: 'deploy', label: 'Deploy', icon: '🚀', path: mvpId ? `/mvp/${mvpId}/deploy` : '#' },
  ]

  const handleTabClick = (tab: ModeTab) => {
    if (tab.path === '#') return

    if (onModeChange) {
      // Use callback for single-page mode switching
      onModeChange(tab.id as 'generate' | 'preview' | 'deploy')
    } else {
      // Use router for page navigation
      router.push(tab.path)
    }
  }

  return (
    <div className="flex items-center gap-2 px-6 py-3 bg-[#111113] border-b border-white/10">
      {tabs.map((tab) => {
        const isActive = currentMode === tab.id
        const isDisabled = tab.path === '#'

        return (
          <button
            key={tab.id}
            onClick={() => handleTabClick(tab)}
            disabled={isDisabled}
            className={`
              flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
              ${isActive
                ? 'bg-white/10 text-white shadow-sm'
                : isDisabled
                ? 'text-zinc-600 cursor-not-allowed'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }
            `}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        )
      })}

      {/* Status Indicator */}
      <div className="ml-auto flex items-center gap-2 text-sm text-zinc-400">
        {currentMode === 'generate' && (
          <div className="flex items-center gap-2">
            <div className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00ff94] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00ff94]"></span>
            </div>
            <span>Generating...</span>
          </div>
        )}
        {currentMode === 'preview' && (
          <div className="flex items-center gap-2">
            <span className="text-[#00ff94]">✓</span>
            <span>Ready to Deploy</span>
          </div>
        )}
        {currentMode === 'deploy' && (
          <div className="flex items-center gap-2">
            <span className="text-[#00e5ff]">🔄</span>
            <span>Deploying...</span>
          </div>
        )}
      </div>
    </div>
  )
}
