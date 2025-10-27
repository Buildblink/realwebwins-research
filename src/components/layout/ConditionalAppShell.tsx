'use client'

import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { NavSidebar } from '@/components/nav/NavSidebar'
import { HeaderBar } from '@/components/nav/HeaderBar'

interface ConditionalAppShellProps {
  children: React.ReactNode
  isAuthenticated?: boolean
  userEmail?: string
  userTier?: 'free' | 'pro' | 'premium'
}

/**
 * Conditionally renders app shell (sidebar + header) based on current route
 *
 * Routes WITHOUT app shell (immersive/standalone):
 * - /mvp/[id] - MVP workspace with custom layout
 * - /studio - Uses its own AppShell component
 *
 * All other routes get the global app shell
 */
export function ConditionalAppShell({
  children,
  isAuthenticated = false,
  userEmail,
  userTier = 'free',
}: ConditionalAppShellProps) {
  const pathname = usePathname()
  const [showMobileSidebar, setShowMobileSidebar] = useState(false)

  // Routes that should NOT have the app shell
  const isImmersiveRoute =
    pathname.startsWith('/mvp/') ||
    pathname.startsWith('/studio')

  // If immersive route, render children without shell
  if (isImmersiveRoute) {
    return <>{children}</>
  }

  // Otherwise, render with app shell
  return (
    <div className="flex min-h-dvh bg-bg text-foreground">
      {/* Sidebar - Desktop */}
      <NavSidebar
        isAuthenticated={isAuthenticated}
        userTier={userTier}
      />

      {/* Mobile Sidebar Overlay */}
      {showMobileSidebar && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={() => setShowMobileSidebar(false)}
          />

          {/* Sidebar */}
          <div className="fixed left-0 top-0 bottom-0 z-50 md:hidden animate-slide-in-right">
            <NavSidebar
              isAuthenticated={isAuthenticated}
              userTier={userTier}
              className="flex"
            />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        <HeaderBar
          isAuthenticated={isAuthenticated}
          userEmail={userEmail}
          userTier={userTier}
          onMobileMenuToggle={() => setShowMobileSidebar(!showMobileSidebar)}
        />

        <main className="flex-1 overflow-y-auto">
          {children}
        </main>

        {/* Global Footer */}
        <footer className="border-t border-subtle bg-bg">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {/* Brand */}
              <div className="col-span-1">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
                    <span className="text-white font-bold text-sm">RW</span>
                  </div>
                  <span className="font-semibold text-foreground">RealWebWins</span>
                </div>
                <p className="text-sm text-foreground-dim">
                  AI-powered startup validation and MVP generation platform.
                </p>
              </div>

              {/* Product */}
              <div>
                <h3 className="font-semibold text-foreground mb-3">Product</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="/docs" className="text-foreground-dim hover:text-foreground transition-colors">
                      Documentation
                    </a>
                  </li>
                  <li>
                    <a href="/cases" className="text-foreground-dim hover:text-foreground transition-colors">
                      Case Studies
                    </a>
                  </li>
                  <li>
                    <a href="/vault" className="text-foreground-dim hover:text-foreground transition-colors">
                      Pain Point Vault
                    </a>
                  </li>
                  <li>
                    <a href="/studio" className="text-foreground-dim hover:text-foreground transition-colors">
                      AI Studio
                    </a>
                  </li>
                </ul>
              </div>

              {/* Resources */}
              <div>
                <h3 className="font-semibold text-foreground mb-3">Resources</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="/docs#quickstart" className="text-foreground-dim hover:text-foreground transition-colors">
                      Quickstart
                    </a>
                  </li>
                  <li>
                    <a href="/docs#faq" className="text-foreground-dim hover:text-foreground transition-colors">
                      FAQ
                    </a>
                  </li>
                  <li>
                    <a href="/public/leaderboard" className="text-foreground-dim hover:text-foreground transition-colors">
                      Agent Leaderboard
                    </a>
                  </li>
                  <li>
                    <a href="https://github.com/realwebwins" target="_blank" rel="noopener noreferrer" className="text-foreground-dim hover:text-foreground transition-colors">
                      GitHub →
                    </a>
                  </li>
                </ul>
              </div>

              {/* Company */}
              <div>
                <h3 className="font-semibold text-foreground mb-3">Company</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="/about" className="text-foreground-dim hover:text-foreground transition-colors">
                      About
                    </a>
                  </li>
                  <li>
                    <a href="/pricing" className="text-foreground-dim hover:text-foreground transition-colors">
                      Pricing
                    </a>
                  </li>
                  <li>
                    <a href="/contact" className="text-foreground-dim hover:text-foreground transition-colors">
                      Contact
                    </a>
                  </li>
                  <li>
                    <a href="/privacy" className="text-foreground-dim hover:text-foreground transition-colors">
                      Privacy
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="mt-8 pt-8 border-t border-subtle flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-foreground-muted">
              <p>
                © {new Date().getFullYear()} RealWebWins. Built with Next.js, Supabase, and Claude.
              </p>
              <div className="flex gap-4">
                <a href="/privacy" className="hover:text-foreground transition-colors">
                  Privacy
                </a>
                <a href="/terms" className="hover:text-foreground transition-colors">
                  Terms
                </a>
                <span className="text-foreground-dim/50">Phase 43-45</span>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}
