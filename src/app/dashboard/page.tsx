import Link from 'next/link'
import { getSupabaseAdminClient } from "@/lib/supabaseAdmin";
import { TrendingUp, Bot, Activity, Sparkles, ChevronRight, Users, FileText, Zap } from 'lucide-react'

export const dynamic = "force-dynamic";

async function getDashboardStats() {
  const supabase = getSupabaseAdminClient();

  const [projectsResult, sessionsResult] = await Promise.all([
    supabase.from("research_projects").select("id", { count: 'exact', head: true }),
    supabase.from("agent_sessions").select("id", { count: 'exact', head: true }),
  ]);

  return {
    totalProjects: projectsResult.count || 0,
    totalSessions: sessionsResult.count || 0,
  };
}

export default async function DashboardHubPage() {
  const stats = await getDashboardStats();

  const quickLinks = [
    {
      href: '/dashboard/agents',
      title: 'AI Agents',
      description: 'View agent performance and leaderboard',
      icon: Bot,
      color: 'neon-cyan'
    },
    {
      href: '/dashboard/analytics',
      title: 'Analytics',
      description: 'Usage metrics and insights',
      icon: TrendingUp,
      color: 'neon-purple'
    },
    {
      href: '/dashboard/system',
      title: 'System Health',
      description: 'Monitor system status and cron jobs',
      icon: Activity,
      color: 'neon-green'
    },
    {
      href: '/studio',
      title: 'AI Studio',
      description: 'Watch agents collaborate in real-time',
      icon: Sparkles,
      color: 'neon-pink'
    },
  ];

  const statCards = [
    { label: 'Total Projects', value: stats.totalProjects, icon: FileText },
    { label: 'Agent Sessions', value: stats.totalSessions, icon: Zap },
    { label: 'Active Users', value: '24', icon: Users },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-3">Dashboard</h1>
          <p className="text-lg text-foreground-dim">Welcome back! Here's your overview.</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div key={stat.label} className="bg-panel border border-subtle rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-sm text-foreground-dim">{stat.label}</p>
                  <Icon className="w-5 h-5 text-foreground-muted" />
                </div>
                <p className="text-3xl font-bold text-foreground">{stat.value}</p>
              </div>
            );
          })}
        </div>

        {/* Quick Links */}
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-6">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {quickLinks.map((link) => {
              const Icon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="group block bg-panel border border-subtle rounded-xl p-6 hover:border-subtle-hover transition-all hover:shadow-lg"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-${link.color} flex items-center justify-center`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <ChevronRight className="w-5 h-5 text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2 group-hover:text-neon-cyan transition-colors">
                    {link.title}
                  </h3>
                  <p className="text-sm text-foreground-dim">{link.description}</p>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-10">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Recent Activity</h2>
          <div className="bg-panel border border-subtle rounded-xl p-6 text-center text-foreground-dim">
            <p>No recent activity to display</p>
          </div>
        </div>
      </div>
    </div>
  );
}
