import { BookOpen, Rocket, Zap, HelpCircle } from 'lucide-react'
import Link from 'next/link'

export default function DocsPage() {
  const sections = [
    {
      id: 'quickstart',
      title: 'Quickstart Guide',
      icon: Rocket,
      content: [
        { step: 1, title: 'Create an Account', description: 'Sign up for free and get instant access to AI agents' },
        { step: 2, title: 'Submit Your Idea', description: 'Enter your business idea or pain point for validation' },
        { step: 3, title: 'Review Insights', description: 'Get comprehensive analysis from 7 AI agents in minutes' },
      ],
    },
    {
      id: 'features',
      title: 'Key Features',
      icon: Zap,
      content: [
        { title: 'Chat Theater', description: 'Watch AI agents collaborate in real-time on your MVP' },
        { title: 'Research Vault', description: 'Browse validated business ideas and pain points' },
        { title: 'One-Click Deploy', description: 'Deploy your MVP to Vercel with GitHub integration' },
      ],
    },
  ];

  const faqs = [
    { q: 'How does the AI validation work?', a: 'Our 7 AI agents analyze your idea from different angles: market research, technical feasibility, competition, pricing, and more.' },
    { q: 'What tiers are available?', a: 'Free tier includes basic validation. Pro unlocks export tools. Premium adds advanced agents and priority support.' },
    { q: 'Can I deploy my MVP?', a: 'Yes! Pro+ users can deploy to GitHub and Vercel with one click from the workspace.' },
  ];

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-4xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="text-center mb-16">
          <BookOpen className="w-16 h-16 mx-auto mb-4 text-neon-cyan" />
          <h1 className="text-4xl font-bold text-foreground mb-4">Documentation</h1>
          <p className="text-lg text-foreground-dim">Everything you need to validate ideas and build MVPs with AI</p>
        </div>

        {/* Sections */}
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <div key={section.id} id={section.id} className="mb-16">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-xl bg-neon-purple/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-neon-purple" />
                </div>
                <h2 className="text-3xl font-semibold text-foreground">{section.title}</h2>
              </div>

              <div className="space-y-4">
                {section.content.map((item, i) => (
                  <div key={i} className="bg-panel border border-subtle rounded-xl p-6">
                    {'step' in item && (
                      <span className="inline-block px-3 py-1 bg-neon-cyan/20 text-neon-cyan text-sm font-semibold rounded-full mb-3">
                        Step {item.step}
                      </span>
                    )}
                    <h3 className="text-lg font-semibold text-foreground mb-2">{item.title}</h3>
                    <p className="text-foreground-dim">{item.description}</p>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        {/* FAQ */}
        <div id="faq" className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-neon-green/20 flex items-center justify-center">
              <HelpCircle className="w-5 h-5 text-neon-green" />
            </div>
            <h2 className="text-3xl font-semibold text-foreground">FAQ</h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <details key={i} className="bg-panel border border-subtle rounded-xl p-6 group">
                <summary className="font-semibold text-foreground cursor-pointer list-none flex items-center justify-between">
                  {faq.q}
                  <span className="text-foreground-muted group-open:rotate-180 transition-transform">▼</span>
                </summary>
                <p className="mt-4 text-foreground-dim">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>

        {/* CTA */}
        <div className="text-center bg-gradient-to-br from-neon-cyan/10 to-neon-purple/10 border border-neon-cyan/30 rounded-2xl p-10">
          <h3 className="text-2xl font-bold text-foreground mb-3">Ready to Start?</h3>
          <p className="text-foreground-dim mb-6">Join thousands of builders validating ideas with AI</p>
          <Link
            href="/auth/signup"
            className="inline-block px-8 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary-hover transition-colors"
          >
            Get Started Free
          </Link>
        </div>
      </div>
    </div>
  );
}
