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
  const { getFilters, setFilters, getScrollPosition, setScrollPosition, updateActiveEntity } = useSessionState()
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
        setShowDiscoverDialog(false)
        setDiscoverKeywords('')
        alert(`Discovered ${result.total} jobs from ${result.dataset_used}`)
      }
    } catch (error) {
      console.error('Failed to discover jobs:', error)
      alert('Failed to discover jobs. Please try again.')
    } finally {
      setIsDiscovering(false)
    }
  }

  const handleProjectClick = (projectId: string) => {
    updateActiveEntity('project', projectId)
    router.push(`/projects/${projectId}`)
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
          <StatsCard key="total-jobs" title="Total Jobs" value={stats.total_jobs || 0} />
          <StatsCard
            key="platforms"
            title="Platforms"
            value={stats.by_platform ? Object.keys(stats.by_platform).length : 0}
          />
          <StatsCard
            key="top-skill"
            title="Top Skill"
            value={
              stats.by_skill && Object.keys(stats.by_skill).length > 0
                ? Object.entries(stats.by_skill).sort((a, b) => b[1] - a[1])[0]?.[0]
                : 'N/A'
            }
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

      {/* Projects List */}
      <div className="grid gap-4">
        {projects.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
            <p className="text-muted-foreground mb-4">No projects found</p>
            <p className="text-sm text-muted-foreground mb-4">
              Click "Discover Jobs" to find opportunities from HuggingFace datasets
            </p>
            <button
              onClick={() => setShowDiscoverDialog(true)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Discover Jobs
            </button>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onClick={() => handleProjectClick(project.id)}
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

function StatsCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <p className="text-sm text-muted-foreground">{title}</p>
      <p className="text-2xl font-bold mt-1">{value}</p>
    </div>
  )
}

function ProjectCard({
  project,
  onClick,
}: {
  project: Project
  onClick: () => void
}) {
  const router = useRouter()

  const handleGenerateProposal = (e: React.MouseEvent) => {
    e.stopPropagation() // Prevent card click
    
    // Navigate to new proposal page with job data as query params
    const params = new URLSearchParams({
      jobId: project.id,
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
    <div className="rounded-lg border border-slate-200 p-6 transition-all dark:border-slate-800 hover:shadow-md">
      <div className="flex items-start justify-between">
        <div className="flex-1 cursor-pointer" onClick={onClick}>
          <h3 className="font-semibold text-lg">{project.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{project.company}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
          {project.platform}
        </span>
      </div>

      <p className="mt-3 text-sm text-muted-foreground line-clamp-2 cursor-pointer" onClick={onClick}>
        {project.description}
      </p>

      {project.skills && project.skills.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {project.skills.slice(0, 5).map((skill, i) => (
            <span
              key={i}
              className="rounded-md bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800"
            >
              {skill}
            </span>
          ))}
          {project.skills.length > 5 && (
            <span className="rounded-md bg-slate-100 px-2 py-1 text-xs dark:bg-slate-800">
              +{project.skills.length - 5} more
            </span>
          )}
        </div>
      )}

      <div className="mt-4 flex items-center justify-between">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          {project.location && <span>📍 {project.location}</span>}
          {project.budget && (
            <span>
              💰 ${project.budget.min?.toLocaleString()} - $
              {project.budget.max?.toLocaleString()}
            </span>
          )}
          {project.posted_date && (
            <span>🕒 {new Date(project.posted_date).toLocaleDateString()}</span>
          )}
        </div>
        
        <button
          onClick={handleGenerateProposal}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Generate Proposal
        </button>
      </div>
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
