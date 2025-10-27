/**
 * Central Navigation Configuration
 * Phase 43-45: Single source of truth for all app navigation
 */

export interface NavLink {
  href: string
  label: string
  icon?: string
  description?: string
  requiresAuth?: boolean
  requiredTier?: 'free' | 'pro' | 'premium'
  badge?: string
}

export interface NavSection {
  title?: string
  links: NavLink[]
}

/**
 * Primary navigation - Main app sections
 * Displayed in sidebar and mobile menu
 */
export const primaryNav: NavLink[] = [
  {
    href: '/',
    label: 'Home',
    icon: 'Home',
    description: 'Research dashboard and idea validation',
  },
  {
    href: '/research/browse',
    label: 'Research',
    icon: 'Search',
    description: 'Browse validated business ideas and MVPs',
  },
  {
    href: '/vault',
    label: 'Pain Points',
    icon: 'Archive',
    description: 'Public vault of validated pain points',
  },
  {
    href: '/cases',
    label: 'Case Studies',
    icon: 'Briefcase',
    description: 'Success stories and examples',
  },
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'Gauge',
    description: 'Analytics, agents, and system health',
    requiresAuth: true,
  },
  {
    href: '/tools',
    label: 'Tools',
    icon: 'Wrench',
    description: 'Export to Notion, Beehiiv, and more',
    requiresAuth: true,
    requiredTier: 'pro',
  },
  {
    href: '/docs',
    label: 'Docs',
    icon: 'BookOpen',
    description: 'Guides, tutorials, and FAQs',
  },
]

/**
 * Secondary navigation - Advanced features
 * Displayed at bottom of sidebar
 */
export const secondaryNav: NavLink[] = [
  {
    href: '/studio',
    label: 'AI Studio',
    icon: 'Sparkles',
    description: 'Watch AI agents collaborate in real-time',
    badge: 'New',
  },
  {
    href: '/showcase',
    label: 'Showcase',
    icon: 'Star',
    description: 'Featured projects and highlights',
  },
]

/**
 * Dashboard sub-navigation
 * Displayed when on /dashboard/* routes
 */
export const dashboardNav: NavLink[] = [
  {
    href: '/dashboard',
    label: 'Overview',
    icon: 'LayoutDashboard',
    description: 'Summary and key metrics',
  },
  {
    href: '/dashboard/agents',
    label: 'Agents',
    icon: 'Bot',
    description: 'AI agent analytics and leaderboard',
  },
  {
    href: '/dashboard/agents/leaderboard',
    label: 'Leaderboard',
    icon: 'Trophy',
    description: 'Top performing agents',
  },
  {
    href: '/dashboard/agents/network',
    label: 'Network',
    icon: 'Network',
    description: 'Agent collaboration graph',
  },
  {
    href: '/dashboard/agents/memory',
    label: 'Memory',
    icon: 'Database',
    description: 'Agent knowledge and context',
  },
  {
    href: '/dashboard/analytics',
    label: 'Analytics',
    icon: 'LineChart',
    description: 'Usage and performance metrics',
  },
  {
    href: '/dashboard/system',
    label: 'System Health',
    icon: 'Activity',
    description: 'Status and monitoring',
  },
]

/**
 * User menu navigation
 * Displayed in HeaderBar user dropdown
 */
export const userMenuNav: NavLink[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: 'LayoutDashboard',
  },
  {
    href: '/research/browse',
    label: 'My Research',
    icon: 'FileText',
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: 'Settings',
  },
  {
    href: '/auth/signout',
    label: 'Sign Out',
    icon: 'LogOut',
  },
]

/**
 * Footer navigation
 * Displayed in global footer
 */
export const footerNav: NavSection[] = [
  {
    title: 'Product',
    links: [
      { href: '/docs', label: 'Documentation' },
      { href: '/cases', label: 'Case Studies' },
      { href: '/vault', label: 'Pain Point Vault' },
      { href: '/studio', label: 'AI Studio' },
    ],
  },
  {
    title: 'Resources',
    links: [
      { href: '/docs#quickstart', label: 'Quickstart' },
      { href: '/docs#faq', label: 'FAQ' },
      { href: 'https://github.com/realwebwins', label: 'GitHub' },
      { href: '/public/leaderboard', label: 'Agent Leaderboard' },
    ],
  },
  {
    title: 'Company',
    links: [
      { href: '/about', label: 'About' },
      { href: '/pricing', label: 'Pricing' },
      { href: '/contact', label: 'Contact' },
      { href: '/privacy', label: 'Privacy' },
    ],
  },
]

/**
 * Helper: Check if link matches current pathname
 */
export function isLinkActive(href: string, pathname: string): boolean {
  if (href === '/') {
    return pathname === '/'
  }
  return pathname.startsWith(href)
}

/**
 * Helper: Check if user can access link based on auth and tier
 */
export function canAccessLink(
  link: NavLink,
  isAuthenticated: boolean,
  userTier?: 'free' | 'pro' | 'premium'
): boolean {
  // Check auth requirement
  if (link.requiresAuth && !isAuthenticated) {
    return false
  }

  // Check tier requirement
  if (link.requiredTier && userTier) {
    const tierLevels = { free: 0, pro: 1, premium: 2 }
    const userLevel = tierLevels[userTier]
    const requiredLevel = tierLevels[link.requiredTier]
    return userLevel >= requiredLevel
  }

  return true
}

/**
 * Helper: Get breadcrumb trail for current path
 */
export function getBreadcrumbs(pathname: string): NavLink[] {
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs: NavLink[] = [{ href: '/', label: 'Home' }]

  let currentPath = ''
  for (const segment of segments) {
    currentPath += `/${segment}`

    // Find matching link in all nav arrays
    const allLinks = [
      ...primaryNav,
      ...secondaryNav,
      ...dashboardNav,
      ...userMenuNav,
    ]
    const link = allLinks.find((l) => l.href === currentPath)

    if (link) {
      breadcrumbs.push(link)
    } else {
      // Fallback: capitalize segment
      breadcrumbs.push({
        href: currentPath,
        label: segment.charAt(0).toUpperCase() + segment.slice(1),
      })
    }
  }

  return breadcrumbs
}
