import { Activity, CheckCircle2, AlertCircle, Clock, Database, Zap } from 'lucide-react'

export default function SystemHealthPage() {
  const healthChecks = [
    { name: 'Database Connection', status: 'healthy', lastCheck: '2 min ago', icon: Database },
    { name: 'Agent Network', status: 'healthy', lastCheck: '5 min ago', icon: Zap },
    { name: 'API Endpoints', status: 'healthy', lastCheck: '1 min ago', icon: Activity },
  ];

  const cronJobs = [
    { name: 'agents-daily', schedule: 'Daily at 00:00', lastRun: '12h ago', status: 'success' },
    { name: 'agents-reflect', schedule: 'Every 6h', lastRun: '3h ago', status: 'success' },
    { name: 'analytics-weekly', schedule: 'Sunday 00:00', lastRun: '2d ago', status: 'success' },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-bold text-foreground mb-3">System Health</h1>
        <p className="text-lg text-foreground-dim mb-10">Monitor system status, services, and scheduled jobs</p>

        {/* Health Checks */}
        <div className="mb-10">
          <h2 className="text-2xl font-semibold text-foreground mb-6">Service Status</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {healthChecks.map((check) => {
              const Icon = check.icon;
              return (
                <div key={check.name} className="bg-panel border border-subtle rounded-xl p-6">
                  <div className="flex items-start justify-between mb-4">
                    <Icon className="w-6 h-6 text-neon-cyan" />
                    <CheckCircle2 className="w-5 h-5 text-neon-green" />
                  </div>
                  <h3 className="font-semibold text-foreground mb-2">{check.name}</h3>
                  <div className="flex items-center gap-2 text-sm">
                    <Clock className="w-3 h-3 text-foreground-muted" />
                    <span className="text-foreground-dim">{check.lastCheck}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cron Jobs */}
        <div>
          <h2 className="text-2xl font-semibold text-foreground mb-6">Scheduled Jobs</h2>
          <div className="bg-panel border border-subtle rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-bg border-b border-subtle">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Job Name</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Schedule</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Last Run</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-foreground">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {cronJobs.map((job) => (
                    <tr key={job.name} className="border-b border-subtle last:border-0">
                      <td className="px-6 py-4 text-sm font-mono text-foreground">{job.name}</td>
                      <td className="px-6 py-4 text-sm text-foreground-dim">{job.schedule}</td>
                      <td className="px-6 py-4 text-sm text-foreground-dim">{job.lastRun}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-neon-green/20 text-neon-green text-xs font-semibold rounded-full">
                          <CheckCircle2 className="w-3 h-3" />
                          {job.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
