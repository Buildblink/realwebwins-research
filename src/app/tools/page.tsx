'use client'

import { useState } from 'react'
import { FileText, Mail, MessageSquare, Download, Loader2, CheckCircle2 } from 'lucide-react'

export default function ToolsPage() {
  const [loading, setLoading] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const tools = [
    {
      id: 'notion',
      title: 'Export to Notion',
      description: 'Export all research projects to your Notion workspace',
      icon: FileText,
      endpoint: '/api/export/notion',
    },
    {
      id: 'beehiiv',
      title: 'Export to Beehiiv',
      description: 'Create newsletter content from your research',
      icon: Mail,
      endpoint: '/api/export/beehiiv',
    },
    {
      id: 'tweets',
      title: 'Generate Tweets',
      description: 'Create tweet threads from your best insights',
      icon: MessageSquare,
      endpoint: '/api/export/tweets',
    },
  ];

  const handleExport = async (tool: typeof tools[0]) => {
    setLoading(tool.id)
    setSuccess(null)

    try {
      const response = await fetch(tool.endpoint, { method: 'POST' })
      if (response.ok) {
        setSuccess(tool.id)
        setTimeout(() => setSuccess(null), 3000)
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setLoading(null)
    }
  };

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-6 py-10">
        <h1 className="text-4xl font-bold text-foreground mb-3">Export Tools</h1>
        <p className="text-lg text-foreground-dim mb-10">Export your research to various platforms</p>

        <div className="grid md:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isLoading = loading === tool.id;
            const isSuccess = success === tool.id;

            return (
              <div key={tool.id} className="bg-panel border border-subtle rounded-xl p-6">
                <div className="w-12 h-12 rounded-xl bg-neon-purple/20 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-neon-purple" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{tool.title}</h3>
                <p className="text-sm text-foreground-dim mb-6">{tool.description}</p>
                <button
                  onClick={() => handleExport(tool)}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <><Loader2 className="w-5 h-5 animate-spin" />Exporting...</>
                  ) : isSuccess ? (
                    <><CheckCircle2 className="w-5 h-5" />Success!</>
                  ) : (
                    <><Download className="w-5 h-5" />Export</>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
