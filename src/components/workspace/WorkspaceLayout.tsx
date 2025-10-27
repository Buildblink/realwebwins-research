'use client'

import { ReactNode } from 'react'

interface WorkspaceLayoutProps {
  sidebar?: ReactNode
  main: ReactNode
  panel?: ReactNode
  header?: ReactNode
  footer?: ReactNode
}

export function WorkspaceLayout({
  sidebar,
  main,
  panel,
  header,
  footer,
}: WorkspaceLayoutProps) {
  return (
    <div className="flex flex-col h-screen bg-[#060608] text-zinc-50">
      {/* Header */}
      {header && (
        <div className="flex-none border-b border-white/10">
          {header}
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar */}
        {sidebar && (
          <aside className="w-[280px] flex-none border-r border-white/10 overflow-y-auto">
            <div className="p-4">
              {sidebar}
            </div>
          </aside>
        )}

        {/* Main Stage (Center) */}
        <main className="flex-1 overflow-y-auto">
          {main}
        </main>

        {/* Right Panel */}
        {panel && (
          <aside className="w-[320px] flex-none border-l border-white/10 overflow-y-auto">
            <div className="p-4">
              {panel}
            </div>
          </aside>
        )}
      </div>

      {/* Footer */}
      {footer && (
        <div className="flex-none border-t border-white/10 px-6 py-3">
          {footer}
        </div>
      )}
    </div>
  )
}
