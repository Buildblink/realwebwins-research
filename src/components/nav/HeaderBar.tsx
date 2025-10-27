'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Search, Menu, X, User, Settings, LogOut } from 'lucide-react'

interface HeaderBarProps {
  isAuthenticated?: boolean
  userEmail?: string
  userTier?: 'free' | 'pro' | 'premium'
  onMobileMenuToggle?: () => void
}

export function HeaderBar({
  isAuthenticated = false,
  userEmail,
  userTier = 'free',
  onMobileMenuToggle,
}: HeaderBarProps) {
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (searchQuery.trim()) {
      // TODO: Implement search functionality
      console.log('Search for:', searchQuery)
    }
  }

  return (
    <header className="sticky top-0 z-30 h-14 bg-bg/80 backdrop-blur-sm border-b border-subtle">
      <div className="h-full flex items-center gap-3 px-4">
        {/* Mobile Menu Toggle */}
        <button
          onClick={onMobileMenuToggle}
          className="md:hidden p-2 rounded-lg hover:bg-panel transition-colors"
          aria-label="Toggle menu"
        >
          <Menu className="w-5 h-5 text-foreground-dim" />
        </button>

        {/* Search Bar */}
        <form
          onSubmit={handleSearch}
          className="flex-1 max-w-md relative"
        >
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted pointer-events-none" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search research, MVPs, agents..."
            className="
              w-full h-10 pl-10 pr-4 rounded-xl
              bg-panel border border-subtle
              text-sm text-foreground placeholder:text-foreground-muted
              focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20
              transition-all
            "
          />
          {/* Search results dropdown would go here */}
        </form>

        {/* Right Side */}
        <div className="flex items-center gap-2">
          {isAuthenticated ? (
            <>
              {/* Tier Badge */}
              <div className={`
                hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wide
                ${userTier === 'premium' ? 'bg-neon-purple text-white' :
                  userTier === 'pro' ? 'bg-neon-cyan text-black' :
                  'bg-panel border border-subtle text-foreground-dim'}
              `}>
                {userTier === 'premium' && '✨'}
                {userTier === 'pro' && '⚡'}
                {userTier}
              </div>

              {/* User Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border border-subtle hover:bg-panel transition-colors"
                  aria-label="User menu"
                  aria-expanded={showUserMenu}
                >
                  <div className="w-7 h-7 rounded-full bg-gradient-to-br from-neon-green to-neon-cyan flex items-center justify-center">
                    <User className="w-4 h-4 text-white" />
                  </div>
                  <span className="hidden sm:block text-sm text-foreground-dim max-w-[120px] truncate">
                    {userEmail || 'User'}
                  </span>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <>
                    {/* Backdrop */}
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setShowUserMenu(false)}
                    />

                    {/* Menu */}
                    <div className="absolute right-0 mt-2 w-56 py-2 bg-panel border border-subtle rounded-xl shadow-lg z-50 animate-fade-in">
                      {/* User Info */}
                      <div className="px-4 py-3 border-b border-subtle">
                        <p className="text-sm font-medium text-foreground truncate">
                          {userEmail || 'user@example.com'}
                        </p>
                        <p className="text-xs text-foreground-muted uppercase mt-0.5">
                          {userTier} Plan
                        </p>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          href="/dashboard"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-foreground-dim hover:bg-panel-hover hover:text-foreground transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <User className="w-4 h-4" />
                          Dashboard
                        </Link>
                        <Link
                          href="/settings"
                          className="flex items-center gap-3 px-4 py-2 text-sm text-foreground-dim hover:bg-panel-hover hover:text-foreground transition-colors"
                          onClick={() => setShowUserMenu(false)}
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>
                      </div>

                      {/* Sign Out */}
                      <div className="border-t border-subtle pt-1">
                        <button
                          onClick={() => {
                            setShowUserMenu(false)
                            // TODO: Implement sign out
                            console.log('Sign out')
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2 text-sm text-danger hover:bg-danger/10 transition-colors"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Sign In / Sign Up */}
              <Link
                href="/auth/signin"
                className="hidden sm:block px-4 py-2 rounded-xl border border-subtle text-sm font-medium text-foreground-dim hover:bg-panel hover:text-foreground transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/signup"
                className="px-4 py-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
