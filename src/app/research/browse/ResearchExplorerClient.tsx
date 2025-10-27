'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Filter, TrendingUp, Calendar, Award, ChevronRight, ExternalLink } from 'lucide-react'

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

interface ResearchExplorerClientProps {
  projects: ResearchProject[]
  categories: string[]
}

export function ResearchExplorerClient({ projects, categories }: ResearchExplorerClientProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [minScore, setMinScore] = useState(0)
  const [sortBy, setSortBy] = useState<'newest' | 'score' | 'confidence'>('newest')

  // Filter and sort projects
  const filteredProjects = useMemo(() => {
    let filtered = projects

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) =>
          p.title?.toLowerCase().includes(query) ||
          p.idea_description?.toLowerCase().includes(query)
      )
    }

    // Category filter
    if (selectedCategory !== 'all') {
      filtered = filtered.filter(
        (p) => p.research_json?.category === selectedCategory
      )
    }

    // Score filter
    filtered = filtered.filter((p) => (p.score || 0) >= minScore)

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'score':
          return (b.score || 0) - (a.score || 0)
        case 'confidence':
          return (b.confidence || 0) - (a.confidence || 0)
        case 'newest':
        default:
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      }
    })

    return filtered
  }, [projects, searchQuery, selectedCategory, minScore, sortBy])

  const getVerdictColor = (verdict: string | null) => {
    switch (verdict?.toLowerCase()) {
      case 'strong':
      case 'promising':
        return 'text-neon-green'
      case 'moderate':
      case 'potential':
        return 'text-neon-cyan'
      case 'weak':
      case 'risky':
        return 'text-neon-yellow'
      default:
        return 'text-foreground-muted'
    }
  }

  const getScoreColor = (score: number | null) => {
    const s = score || 0
    if (s >= 8) return 'text-neon-green'
    if (s >= 6) return 'text-neon-cyan'
    if (s >= 4) return 'text-neon-yellow'
    return 'text-foreground-muted'
  }

  return (
    <div className="space-y-6">
      {/* Filters Bar */}
      <div className="flex flex-col lg:flex-row gap-4 p-4 bg-panel border border-subtle rounded-xl">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground-muted" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search research projects..."
            className="w-full pl-10 pr-4 py-2.5 bg-bg border border-subtle rounded-lg text-sm text-foreground placeholder:text-foreground-muted focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
          />
        </div>

        {/* Category Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-foreground-muted" />
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2.5 bg-bg border border-subtle rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value="all">All Categories</option>
            {categories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        {/* Score Filter */}
        <div className="flex items-center gap-2">
          <Award className="w-4 h-4 text-foreground-muted" />
          <select
            value={minScore}
            onChange={(e) => setMinScore(Number(e.target.value))}
            className="px-3 py-2.5 bg-bg border border-subtle rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value={0}>All Scores</option>
            <option value={4}>4+ Score</option>
            <option value={6}>6+ Score</option>
            <option value={8}>8+ Score</option>
          </select>
        </div>

        {/* Sort */}
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-foreground-muted" />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="px-3 py-2.5 bg-bg border border-subtle rounded-lg text-sm text-foreground focus:outline-none focus:border-primary/50"
          >
            <option value="newest">Newest First</option>
            <option value="score">Highest Score</option>
            <option value="confidence">Highest Confidence</option>
          </select>
        </div>
      </div>

      {/* Results Count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-foreground-dim">
          {filteredProjects.length} {filteredProjects.length === 1 ? 'project' : 'projects'} found
        </p>
        {searchQuery && (
          <button
            onClick={() => {
              setSearchQuery('')
              setSelectedCategory('all')
              setMinScore(0)
            }}
            className="text-sm text-primary hover:text-primary-hover transition-colors"
          >
            Clear filters
          </button>
        )}
      </div>

      {/* Project Grid */}
      {filteredProjects.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <Search className="w-16 h-16 text-foreground-muted mb-4 opacity-20" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No projects found
          </h3>
          <p className="text-sm text-foreground-dim max-w-md">
            Try adjusting your filters or search query to find more results.
          </p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProjects.map((project) => (
            <Link
              key={project.id}
              href={`/mvp/${project.id}`}
              className="group block p-6 bg-panel border border-subtle rounded-xl hover:border-subtle-hover transition-all hover:shadow-lg"
            >
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-foreground group-hover:text-neon-cyan transition-colors line-clamp-2 mb-2">
                    {project.title || 'Untitled Project'}
                  </h3>
                  <p className="text-sm text-foreground-dim line-clamp-2">
                    {project.idea_description || 'No description available'}
                  </p>
                </div>
                <ExternalLink className="w-4 h-4 text-foreground-muted opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 ml-2" />
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="flex items-center gap-2">
                  <Award className="w-4 h-4 text-foreground-muted" />
                  <div>
                    <p className="text-xs text-foreground-muted">Score</p>
                    <p className={`text-sm font-semibold ${getScoreColor(project.score)}`}>
                      {project.score ? project.score.toFixed(1) : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-foreground-muted" />
                  <div>
                    <p className="text-xs text-foreground-muted">Confidence</p>
                    <p className="text-sm font-semibold text-foreground">
                      {project.confidence ? `${Math.round(project.confidence * 100)}%` : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between pt-4 border-t border-subtle">
                <div className="flex items-center gap-2">
                  <Calendar className="w-3 h-3 text-foreground-muted" />
                  <span className="text-xs text-foreground-muted">
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>

                {project.verdict && (
                  <span className={`text-xs font-semibold uppercase ${getVerdictColor(project.verdict)}`}>
                    {project.verdict}
                  </span>
                )}
              </div>

              {/* Hover Arrow */}
              <div className="mt-4 flex items-center gap-2 text-sm text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Open in Workspace</span>
                <ChevronRight className="w-4 h-4" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
