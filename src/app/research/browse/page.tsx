import { cookies } from 'next/headers'
import {  createServerComponentClient } from '@supabase/auth-helpers-nextjs'
import { ResearchExplorerClient } from './ResearchExplorerClient'

export const metadata = {
  title: 'Research Explorer | RealWebWins',
  description: 'Browse validated business ideas and MVP concepts from the RealWebWins research vault',
}

export const dynamic = 'force-dynamic'

interface ResearchProject {
  id: string
  title: string
  idea_description: string
  score: number | null
  verdict: string | null
  confidence: number | null
  created_at: string
  research_report: string | null
  research_json: any | null
  user_id: string | null
}

async function getResearchProjects() {
  try {
    const supabase = createServerComponentClient({ cookies })

    const { data, error } = await supabase
      .from('research_projects')
      .select('id, title, idea_description, score, verdict, confidence, created_at, research_report, research_json, user_id')
      .order('created_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching research projects:', error)
      return []
    }

    return (data || []) as ResearchProject[]
  } catch (error) {
    console.error('Failed to fetch research projects:', error)
    return []
  }
}

export default async function ResearchBrowsePage() {
  const projects = await getResearchProjects()

  // Extract unique categories from research_json
  const categories = new Set<string>()
  projects.forEach((project) => {
    if (project.research_json?.category) {
      categories.add(project.research_json.category)
    }
  })

  return (
    <div className="min-h-screen bg-bg">
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-4xl font-bold text-foreground mb-3">
            Research Explorer
          </h1>
          <p className="text-lg text-foreground-dim max-w-2xl">
            Browse validated business ideas and MVP concepts. Each project has been analyzed by AI agents for market fit, competition, and viability.
          </p>
        </div>

        {/* Client Component with Filters */}
        <ResearchExplorerClient
          projects={projects}
          categories={Array.from(categories)}
        />
      </div>
    </div>
  )
}
