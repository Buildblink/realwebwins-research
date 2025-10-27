'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { primaryNav, secondaryNav, isLinkActive } from '@/lib/nav'
import {
  Home,
  Search,
  Archive,
  Briefcase,
  Gauge,
  Wrench,
  BookOpen,
  Sparkles,
  Star,
  Lock,
} from 'lucide-react'

const iconMap: Record<string, any> = {
  Home,
  Search,
  Archive,
  Briefcase,
  Gauge,
  Wrench,
  BookOpen,
  Sparkles,
  Star,
}

interface NavSidebarProps {
  isAuthenticated?: boolean
  userTier?: 'free' | 'pro' | 'premium'
  className?: string
}

export function NavSidebar({
  isAuthenticated = false,
  userTier = 'free',
  className = '',
}: NavSidebarProps) {
  const pathname = usePathname()

  const renderNavLink = (link: typeof primaryNav[0]) => {
    const active = isLinkActive(link.href, pathname)
    const Icon = iconMap[link.icon || 'Home']
    const isLocked = link.requiresAuth && !isAuthenticated

    return (
      <Link
        key={link.href}
        href={isLocked ? '#' : link.href}
        className={`
          group relative flex items-center gap-3 px-4 py-2.5 rounded-xl
          border border-transparent transition-all duration-200
          ${
            active
              ? 'bg-panel border-subtle shadow-sm'
              : 'hover:bg-panel/50 hover:border-subtle'
          }
          ${isLocked ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        aria-current={active ? 'page' : undefined}
        title={link.description}
      >
        <Icon
          className={`
            w-5 h-5 transition-colors
            ${
              active
                ? 'text-neon-cyan'
                : 'text-foreground-dim group-hover:text-foreground'
            }
          `}
        />
        <span
          className={`
            text-sm font-medium transition-colors
            ${
              active
                ? 'text-foreground'
                : 'text-foreground-dim group-hover:text-foreground'
            }
          `}
        >
          {link.label}
        </span>

        {link.badge && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-neon-purple text-white font-semibold uppercase tracking-wide">
            {link.badge}
          </span>
        )}

        {isLocked && (
          <Lock className="ml-auto w-4 h-4 text-foreground-muted" />
        )}

        {/* Active indicator */}
        {active && (
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-neon-cyan rounded-r-full" />
        )}
      </Link>
    )
  }

  return (
    <aside
      className={`
        hidden md:flex flex-col w-[260px] bg-bg border-r border-subtle
        ${className}
      `}
    >
      {/* Logo */}
      <div className="px-6 py-4 border-b border-subtle">
        <Link href="/" className="flex items-center gap-2 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-neon-cyan to-neon-purple flex items-center justify-center">
            <span className="text-white font-bold text-sm">RW</span>
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground group-hover:text-neon-cyan transition-colors">
              RealWebWins
            </p>
            <p className="text-[10px] text-foreground-muted uppercase tracking-wider">
              Research Hub
            </p>
          </div>
        </Link>
      </div>

      {/* Primary Navigation */}
      <nav className="flex-1 flex flex-col gap-1 p-3 overflow-y-auto">
        <div className="space-y-1">
          {primaryNav.map(renderNavLink)}
        </div>

        {/* Divider */}
        <div className="my-4 border-t border-subtle" />

        {/* Secondary Navigation */}
        <div>
          <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-wider text-foreground-muted">
            Advanced
          </p>
          <div className="space-y-1">
            {secondaryNav.map(renderNavLink)}
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="p-3 border-t border-subtle">
        {isAuthenticated ? (
          <div className="px-4 py-3 rounded-xl bg-panel border border-subtle">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-neon-green to-neon-cyan flex items-center justify-center text-white font-semibold text-xs">
                U
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">
                  User
                </p>
                <p className="text-[10px] text-foreground-muted uppercase">
                  {userTier} Plan
                </p>
              </div>
            </div>
            <Link
              href="/settings"
              className="block text-center text-xs text-foreground-dim hover:text-foreground transition-colors"
            >
              Settings →
            </Link>
          </div>
        ) : (
          <div className="space-y-2">
            <Link
              href="/auth/signin"
              className="block px-4 py-2.5 rounded-xl bg-primary text-white text-sm font-medium text-center hover:bg-primary-hover transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/signup"
              className="block px-4 py-2.5 rounded-xl border border-subtle text-foreground-dim text-sm font-medium text-center hover:bg-panel hover:text-foreground transition-colors"
            >
              Sign Up
            </Link>
          </div>
        )}
      </div>
    </aside>
  )
}
