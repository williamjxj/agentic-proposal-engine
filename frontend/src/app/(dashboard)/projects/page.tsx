/**
 * Projects Page
 * 
 * Discovers freelance opportunities from HuggingFace datasets.
 * Integrates with session context for state preservation across navigations.
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionState } from '@/hooks/useSessionState'
import { useNavigationTiming } from '@/hooks/useNavigationTiming'
import { LoadingSkeleton } from '@/components/workflow/progress-overlay'
import {
  discoverProjects,
  listProjects,
  getProjectStats,
  getAvailableDatasets,
  type Project,
  type ProjectStats,
  type DatasetInfo,
} from '@/lib/api/client'

interface ProjectFilters {
  search: string
  skills: string[]
  platforms: string[]
  minBudget?: number
  maxBudget?: number
}

export default function ProjectsPage() {
  const router = useRouter()
  const { getFilters, setFilters, getScrollPosition, setScrollPosition } = useSessionState()
  const { measureOperation } = useNavigationTiming()
  const [isLoading, setIsLoading] = useState(true)
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<ProjectStats | null>(null)
  const [datasets, setDatasets] = useState<DatasetInfo[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [isDiscovering, setIsDiscovering] = useState(false)
  const [showDiscoverDialog, setShowDiscoverDialog] = useState(false)
  const [discoverKeywords, setDiscoverKeywords] = useState('')
  const [selectedDataset, setSelectedDataset] = useState('')
  const [discoveryResult, setDiscoveryResult] = useState<{
    count: number
    dataset: string
    keywords: string[]
  } | null>(null)

  // Get saved filters from session state
  const savedFilters = getFilters<ProjectFilters>()
  const [filters, setLocalFilters] = useState<ProjectFilters>({
    search: savedFilters.search || '',
    skills: savedFilters.skills || [],
    platforms: savedFilters.platforms || [],
    minBudget: savedFilters.minBudget,
    maxBudget: savedFilters.maxBudget,
  })

  // Load data and restore scroll position
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)

      try {
        await measureOperation('load-projects', async () => {
          const result = await listProjects(filters, 50, 0)
          if (result) {
            setProjects(result.jobs)
          }
        })

        // Load stats
        const statsResult = await getProjectStats()
        if (statsResult) {
          setStats(statsResult)
        }

        // Load datasets
        const datasetsResult = await getAvailableDatasets()
        if (datasetsResult) {
          setDatasets(datasetsResult)
        }
      } catch (error) {
        console.error('Error loading projects:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    // Restore scroll position after content loads
    const restoreScroll = async () => {
      if (scrollContainerRef.current) {
        const savedPosition = getScrollPosition('/projects')
        if (savedPosition > 0) {
          scrollContainerRef.current.scrollTop = savedPosition
        }
      }
    }

    restoreScroll()
  }, [])

  // Save scroll position on scroll
  useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) return

    const handleScroll = () => {
      const position = container.scrollTop
      setScrollPosition(position)
    }

    container.addEventListener('scroll', handleScroll)
    return () => container.removeEventListener('scroll', handleScroll)
  }, [setScrollPosition])

  // Save filters when they change
  useEffect(() => {
    setFilters(filters)
  }, [filters, setFilters])

  const handleSearch = async () => {
    setIsLoading(true)
    setDiscoveryResult(null) // Clear discovery result on manual search
    try {
      const result = await listProjects(filters, 50, 0)
      if (result) {
        setProjects(result.jobs)
      }
    } catch (error) {
      console.error('Failed to search projects:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleDiscoverJobs = async () => {
    if (!discoverKeywords.trim()) {
      alert('Please enter keywords to search')
      return
    }

    setIsDiscovering(true)
    try {
      const keywords = discoverKeywords.split(',').map((k) => k.trim()).filter(Boolean)
      const result = await discoverProjects({
        keywords,
        max_results: 50,
        dataset_id: selectedDataset || undefined,
      })

      if (result) {
        setProjects(result.jobs)
        setDiscoveryResult({
          count: result.jobs.length,
          dataset: result.dataset_used,
          keywords: keywords
        })
        setShowDiscoverDialog(false)
        setDiscoverKeywords('')
      }
    } catch (error) {
      console.error('Failed to discover jobs:', error)
      alert('Failed to discover jobs. Please try again.')
    } finally {
      setIsDiscovering(false)
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Projects</h1>
        <LoadingSkeleton lines={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6" ref={scrollContainerRef}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="text-muted-foreground mt-2">
            Discover freelance opportunities from HuggingFace datasets
          </p>
        </div>
        <button
          onClick={() => setShowDiscoverDialog(true)}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Discover Jobs
        </button>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StatsCard
            key="total-jobs"
            title="Total Jobs"
            value={stats.total_jobs || 0}
            tip="Total number of relevant projects found across all sources"
          />
          <StatsCard
            key="platforms"
            title="Platforms"
            value={stats.by_platform ? Object.keys(stats.by_platform).length : 0}
            tip="Number of freelance platforms (Upwork, Freelancer, etc.) monitoring"
          />
          <StatsCard
            key="top-skill"
            title="Top Skill"
            value={
              stats.by_skill && Object.keys(stats.by_skill).length > 0
                ? Object.entries(stats.by_skill).sort((a, b) => b[1] - a[1])[0]?.[0]
                : 'N/A'
            }
            tip="The most in-demand skill based on current job descriptions"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search projects..."
          value={filters.search}
          onChange={(e) => setLocalFilters({ ...filters, search: e.target.value })}
          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        <button
          onClick={handleSearch}
          className="rounded-md bg-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700"
        >
          Search
        </button>
      </div>

      {/* Discovery Summary Alert */}
      {discoveryResult && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4 relative dark:border-green-900 dark:bg-green-950">
          <button
            onClick={() => setDiscoveryResult(null)}
            className="absolute top-2 right-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
          >
            ✕
          </button>
          <div className="flex items-start gap-3">
            <span className="text-xl">✨</span>
            <div>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Discovery Complete
              </p>
              <p className="text-sm text-green-700 mt-1 dark:text-green-300">
                Found <span className="font-bold">{discoveryResult.count}</span> jobs in{" "}
                <span className="font-mono bg-green-100 px-1 rounded dark:bg-green-900">
                  {discoveryResult.dataset}
                </span>{" "}
                using keywords:{" "}
                {discoveryResult.keywords.map((k, i) => (
                  <span
                    key={i}
                    className="inline-block bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs font-semibold mx-0.5"
                  >
                    {k}
                  </span>
                ))}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Projects List */}
      <div className="grid gap-6">
        {projects.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-slate-200 p-16 text-center dark:border-slate-800">
            <div className="mx-auto w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center text-3xl mb-4">
              🔍
            </div>
            <p className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-2">No projects found</p>
            <p className="text-muted-foreground max-w-sm mx-auto mb-8">
              We couldn't find any opportunities matching your criteria. Try widening your search or discover new jobs from HuggingFace.
            </p>
            <button
              onClick={() => setShowDiscoverDialog(true)}
              className="rounded-xl bg-primary px-8 py-3 font-bold text-primary-foreground shadow-lg hover:shadow-xl hover:scale-105 transition-all"
            >
              Discover New Jobs
            </button>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectCard
              key={project.id || (project as { external_id?: string }).external_id || Math.random()}
              project={project}
              highlight={filters.search}
            />
          ))
        )}
      </div>

      {/* Discover Dialog */}
      {showDiscoverDialog && (
        <DiscoverDialog
          isDiscovering={isDiscovering}
          keywords={discoverKeywords}
          setKeywords={setDiscoverKeywords}
          datasets={datasets}
          selectedDataset={selectedDataset}
          setSelectedDataset={setSelectedDataset}
          onDiscover={handleDiscoverJobs}
          onClose={() => setShowDiscoverDialog(false)}
        />
      )}
    </div>
  )
}

// Components

// Helper Component for Highlighting Search Keys
function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>

  const regex = new RegExp(`(${highlight})`, 'gi')
  const parts = text.split(regex)

  return (
    <>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-900/50 text-inherit px-0.5 rounded">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </>
  )
}

// Stats Card with improved UI
function StatsCard({ title, value, tip }: { title: string; value: string | number; tip?: string }) {
  return (
    <div className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {tip && (
          <div className="cursor-help text-muted-foreground/40 hover:text-primary transition-colors">
            <span className="text-xs">ⓘ</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 invisible group-hover:visible w-56 p-3 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-20 text-center backdrop-blur-sm bg-opacity-95 border border-slate-700">
              {tip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900"></div>
            </div>
          </div>
        )}
      </div>
      <p className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
        {value}
      </p>
    </div>
  )
}

// Enhanced Project Card
function ProjectCard({
  project,
  highlight,
}: {
  project: Project
  highlight: string
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  const handleGenerateProposal = (e: React.MouseEvent) => {
    e.stopPropagation()

    const projectId = project.id || (project as { external_id?: string }).external_id || ''
    const params = new URLSearchParams({
      jobId: projectId,
      jobTitle: project.title,
      jobCompany: project.company,
      jobDescription: project.description,
      jobPlatform: project.platform,
    })

    if (project.skills && project.skills.length > 0) {
      params.append('jobSkills', project.skills.join(','))
    }

    if (project.budget) {
      params.append('jobBudget', `$${project.budget.min} - $${project.budget.max}`)
    }

    router.push(`/proposals/new?${params.toString()}`)
  }

  return (
    <div
      className="group relative rounded-xl border border-slate-200 bg-white p-6 transition-all duration-300 hover:shadow-lg hover:border-primary/20 dark:border-slate-800 dark:bg-slate-900/40"
    >
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex-1 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center gap-3">
            <h3 className="font-bold text-xl text-slate-900 dark:text-slate-100 group-hover:text-primary transition-colors">
              <HighlightText text={project.title} highlight={highlight} />
            </h3>
            <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
              {project.platform}
            </span>
          </div>
          <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-1.5">
            🏢 <HighlightText text={project.company} highlight={highlight} />
          </p>
        </div>

        <div className="flex items-center gap-2">
          {project.budget && (
            <div className="text-right">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-tighter">Est. Budget</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                ${project.budget.min.toLocaleString()} - ${project.budget.max.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </div>

      <div
        className="mt-4 cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <p className={`text-sm text-slate-600 dark:text-slate-400 leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
          <HighlightText text={project.description} highlight={highlight} />
        </p>
        <p className="text-xs text-primary mt-1 font-medium">
          {expanded ? '▲ Show less' : '▼ View Details'}
        </p>
      </div>

      {expanded && (
        <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
          {project.skills && project.skills.length > 0 && (
            <div className="mb-3">
              <p className="text-xs font-semibold text-slate-500 uppercase mb-1.5">Required skills</p>
              <div className="flex flex-wrap gap-2">
                {project.skills.map((skill, i) => (
                  <span
                    key={i}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap gap-2">
          {project.skills?.slice(0, 4).map((skill, i) => (
            <span
              key={i}
              className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300"
            >
              {skill}
            </span>
          ))}
          {project.skills && project.skills.length > 4 && (
            <span className="text-xs text-muted-foreground self-center">
              +{project.skills.length - 4} more
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleGenerateProposal}
            className="relative overflow-hidden rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground transition-all hover:scale-[1.02] active:scale-95 shadow-sm hover:shadow-md"
          >
            Generate Proposal
          </button>
        </div>
      </div>

      {/* Subtle Bottom Border Interaction */}
      <div className="absolute bottom-0 left-0 h-1 w-0 bg-primary/40 transition-all duration-500 group-hover:w-full rounded-b-xl" />
    </div>
  )
}

function DiscoverDialog({
  isDiscovering,
  keywords,
  setKeywords,
  datasets,
  selectedDataset,
  setSelectedDataset,
  onDiscover,
  onClose,
}: {
  isDiscovering: boolean
  keywords: string
  setKeywords: (k: string) => void
  datasets: DatasetInfo[]
  selectedDataset: string
  setSelectedDataset: (d: string) => void
  onDiscover: () => void
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-md w-full mx-4">
        <h2 className="text-xl font-bold mb-4">Discover Jobs</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="python, fastapi, react"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Example: python, fastapi, backend, infrastructure
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Dataset (optional)
            </label>
            <select
              value={selectedDataset}
              onChange={(e) => setSelectedDataset(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            >
              <option value="">Auto-select (recommended)</option>
              {datasets.map((ds) => (
                <option key={ds.id} value={ds.id}>
                  {ds.name} - {ds.size}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            onClick={onDiscover}
            disabled={isDiscovering}
            className="flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {isDiscovering ? 'Discovering...' : 'Discover'}
          </button>
          <button
            onClick={onClose}
            disabled={isDiscovering}
            className="flex-1 rounded-md bg-slate-200 px-4 py-2 text-sm font-medium hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}
