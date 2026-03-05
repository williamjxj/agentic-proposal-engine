/**
 * Projects Page
 *
 * Discovers freelance opportunities from HuggingFace datasets.
 * Uses TanStack Query for caching; only results area refreshes on search.
 */

'use client'

import { useEffect, useRef, useState, useCallback, memo } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useSessionState } from '@/hooks/useSessionState'
import {
  useProjects,
  useProjectStats,
  useProjectDatasets,
  useDiscoverProjects,
} from '@/hooks/useProjects'
import type { ProjectFilters } from '@/lib/api/client'
import type { Project, ProjectStats, DatasetInfo } from '@/lib/api/client'
import { LoadingSkeleton, CardListSkeleton } from '@/components/workflow/progress-overlay'
import { PageHeader } from '@/components/shared/page-header'
import { PageContainer } from '@/components/shared/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/empty-state'
import { useReduceMotion } from '@/hooks/useReduceMotion'

interface PageProjectFilters {
  search: string
  skills: string[]
  platforms: string[]
  minBudget?: number
  maxBudget?: number
}

function toApiFilters(f: PageProjectFilters): ProjectFilters {
  return {
    search: f.search || undefined,
    skills: f.skills.length ? f.skills : undefined,
    platforms: f.platforms.length ? f.platforms : undefined,
    min_budget: f.minBudget,
    max_budget: f.maxBudget,
  }
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: (reduceMotion: boolean) => ({
    opacity: 1,
    transition: reduceMotion ? {} : { staggerChildren: 0.05, delayChildren: 0.1 },
  }),
}
const itemVariants = {
  hidden: (reduceMotion: boolean) => (reduceMotion ? {} : { opacity: 0, y: 12 }),
  visible: (reduceMotion: boolean) => (reduceMotion ? {} : { opacity: 1, y: 0 }),
}

/** Memoized header/filters - does not re-render when projects or loading state change */
const ProjectsHeader = memo(function ProjectsHeader({
  filters,
  onFiltersChange,
  onSearch,
  onOpenDiscover,
  isSearching,
}: {
  filters: PageProjectFilters
  onFiltersChange: (f: PageProjectFilters) => void
  onSearch: () => void
  onOpenDiscover: () => void
  isSearching: boolean
}) {
  return (
    <>
      <PageHeader
        title="Projects"
        description="Discover freelance opportunities from HuggingFace datasets"
      >
        <Button onClick={onOpenDiscover}>Discover Jobs</Button>
      </PageHeader>
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="text"
          placeholder="Search projects..."
          value={filters.search}
          onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && onSearch()}
          className="flex-1"
        />
        <Button variant="secondary" onClick={onSearch} disabled={isSearching}>
          {isSearching ? 'Searching...' : 'Search'}
        </Button>
      </div>
    </>
  )
})

/** Stats section - rendered once, uses cached data */
function ProjectsStats({ stats }: { stats: ProjectStats | null }) {
  if (!stats) return null
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <StatsCard
        title="Total Jobs"
        value={stats.total_jobs || 0}
        tip="Total number of relevant projects found across all sources"
      />
      <StatsCard
        title="Platforms"
        value={stats.by_platform ? Object.keys(stats.by_platform).length : 0}
        tip="Number of freelance platforms (Upwork, Freelancer, etc.) monitoring"
      />
      <StatsCard
        title="Top Skill"
        value={
          stats.by_skill && Object.keys(stats.by_skill).length > 0
            ? Object.entries(stats.by_skill).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'N/A'
            : 'N/A'
        }
        tip="The most in-demand skill based on current job descriptions"
      />
    </div>
  )
}

function StatsCard({
  title,
  value,
  tip,
}: {
  title: string
  value: string | number
  tip?: string
}) {
  return (
    <div className="group relative rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md hover:border-primary/30 dark:border-slate-800 dark:bg-slate-900/50">
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        {tip && (
          <div className="cursor-help text-muted-foreground/40 hover:text-primary transition-colors">
            <span className="text-xs">ⓘ</span>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 invisible group-hover:visible w-56 p-3 bg-slate-900 text-white text-[11px] rounded-lg shadow-xl z-20 text-center backdrop-blur-sm bg-opacity-95 border border-slate-700">
              {tip}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-slate-900" />
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

/** Results area - only this section shows loading/refreshing */
const ProjectsResults = memo(function ProjectsResults({
  projects,
  isLoading,
  searchHighlight,
  onDiscoverClick,
  reduceMotion,
}: {
  projects: Project[]
  isLoading: boolean
  searchHighlight: string
  onDiscoverClick: () => void
  reduceMotion: boolean
}) {
  if (isLoading) {
    return <CardListSkeleton count={5} />
  }
  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects found"
        description="We couldn't find any opportunities matching your criteria. Try widening your search or discover new jobs from HuggingFace."
        icon={<span className="text-4xl">🔍</span>}
        action={
          <Button size="lg" onClick={onDiscoverClick}>
            Discover New Jobs
          </Button>
        }
      />
    )
  }
  return (
    <motion.div
      className="grid gap-6"
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      custom={reduceMotion}
    >
      {projects.map((project, i) => (
        <motion.div
          key={project.id || (project as { external_id?: string }).external_id || i}
          variants={itemVariants}
          custom={reduceMotion}
        >
          <ProjectCard project={project} highlight={searchHighlight} />
        </motion.div>
      ))}
    </motion.div>
  )
})

function HighlightText({ text, highlight }: { text: string; highlight: string }) {
  if (!highlight.trim()) return <>{text}</>
  const esc = highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const regex = new RegExp(`(${esc})`, 'gi')
  const parts = text.split(regex)
  return (
    <>
      {parts.map((part, i) =>
        part.toLowerCase() === highlight.toLowerCase() ? (
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

function ProjectCard({ project, highlight }: { project: Project; highlight: string }) {
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
    if (project.skills?.length) params.append('jobSkills', project.skills.join(','))
    if (project.budget)
      params.append('jobBudget', `$${project.budget.min} - $${project.budget.max}`)
    router.push(`/proposals/new?${params.toString()}`)
  }

  return (
    <Card className="group transition-all duration-300 hover:shadow-lg">
      <CardHeader className="cursor-pointer pb-2" onClick={() => setExpanded(!expanded)}>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-bold text-xl group-hover:text-primary transition-colors">
                <HighlightText text={project.title} highlight={highlight} />
              </h3>
              <Badge variant="secondary" className="uppercase shrink-0">
                {project.platform}
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1.5">
              🏢 <HighlightText text={project.company} highlight={highlight} />
            </p>
          </div>
          {project.budget && (
            <div className="text-right shrink-0">
              <p className="text-xs font-semibold text-muted-foreground uppercase">Est. Budget</p>
              <p className="text-lg font-bold text-green-600 dark:text-green-400">
                ${project.budget.min.toLocaleString()} - ${project.budget.max.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent className="cursor-pointer pt-0" onClick={() => setExpanded(!expanded)}>
        <p className={`text-sm text-muted-foreground leading-relaxed ${expanded ? '' : 'line-clamp-3'}`}>
          <HighlightText text={project.description} highlight={highlight} />
        </p>
        <p className="text-xs text-primary mt-1 font-medium">
          {expanded ? '▲ Show less' : '▼ View Details'}
        </p>
      </CardContent>
      {expanded && project.skills?.length > 0 && (
        <CardContent className="pt-0">
          <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">Required skills</p>
          <div className="flex flex-wrap gap-2">
            {project.skills.map((skill, i) => (
              <Badge key={i} variant="outline">
                {skill}
              </Badge>
            ))}
          </div>
        </CardContent>
      )}
      <CardFooter className="flex flex-wrap items-center justify-between gap-4 pt-4">
        <div className="flex flex-wrap gap-2">
          {project.skills?.slice(0, 4).map((skill, i) => (
            <Badge key={i} variant="outline">
              {skill}
            </Badge>
          ))}
          {project.skills && project.skills.length > 4 && (
            <span className="text-xs text-muted-foreground self-center">
              +{project.skills.length - 4} more
            </span>
          )}
        </div>
        <Button onClick={handleGenerateProposal} className="shimmer-button">
          Generate Proposal
        </Button>
      </CardFooter>
    </Card>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto my-auto border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-lg sm:text-xl font-bold">Discover Jobs</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 -mr-1" aria-label="Close">
            ✕
          </button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Keywords (comma-separated)</label>
            <input
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="python, fastapi, react"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Dataset (optional)</label>
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
        <div className="flex flex-col-reverse sm:flex-row gap-3 mt-6">
          <button
            onClick={onDiscover}
            disabled={isDiscovering}
            className="shimmer-button flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[44px] sm:min-h-0"
          >
            {isDiscovering ? 'Discovering...' : 'Discover'}
          </button>
          <button
            onClick={onClose}
            disabled={isDiscovering}
            className="flex-1 rounded-md bg-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 min-h-[44px] sm:min-h-0"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

export default function ProjectsPage() {
  const router = useRouter()
  const reduceMotion = useReduceMotion()
  const { getFilters, setFilters, getScrollPosition, setScrollPosition } = useSessionState()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const savedFilters = getFilters<PageProjectFilters>()
  const [filters, setFiltersState] = useState<PageProjectFilters>({
    search: savedFilters.search || '',
    skills: savedFilters.skills || [],
    platforms: savedFilters.platforms || [],
    minBudget: savedFilters.minBudget,
    maxBudget: savedFilters.maxBudget,
  })
  const [appliedFilters, setAppliedFilters] = useState<PageProjectFilters>(() => ({
    search: savedFilters.search || '',
    skills: savedFilters.skills || [],
    platforms: savedFilters.platforms || [],
    minBudget: savedFilters.minBudget,
    maxBudget: savedFilters.maxBudget,
  }))
  const [showDiscoverDialog, setShowDiscoverDialog] = useState(false)
  const [discoverKeywords, setDiscoverKeywords] = useState('')
  const [selectedDataset, setSelectedDataset] = useState('')
  const [discoveryResult, setDiscoveryResult] = useState<{ count: number; dataset: string; keywords: string[] } | null>(null)

  const apiFilters = toApiFilters(appliedFilters)
  const { data: projectsData, isLoading, isFetching, refetch } = useProjects(apiFilters, 50, 0)
  const { data: stats } = useProjectStats()
  const { data: datasets = [] } = useProjectDatasets()
  const discoverMutation = useDiscoverProjects()

  const [discoverOverride, setDiscoverOverride] = useState<Project[] | null>(null)
  const projects = discoverOverride ?? projectsData?.jobs ?? []

  const handleSearch = useCallback(() => {
    setDiscoverOverride(null)
    setAppliedFilters(filters)
  }, [filters])

  useEffect(() => {
    setFilters(filters)
  }, [filters, setFilters])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const pos = getScrollPosition('/projects')
    if (pos > 0) el.scrollTop = pos
  }, [getScrollPosition, projects.length])

  useEffect(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const handler = () => setScrollPosition(el.scrollTop)
    el.addEventListener('scroll', handler)
    return () => el.removeEventListener('scroll', handler)
  }, [setScrollPosition])

  const handleDiscoverJobs = useCallback(async () => {
    if (!discoverKeywords.trim()) {
      alert('Please enter keywords to search')
      return
    }
    const keywords = discoverKeywords.split(',').map((k) => k.trim()).filter(Boolean)
    try {
      const result = await discoverMutation.mutateAsync({
        keywords,
        max_results: 50,
        dataset_id: selectedDataset || undefined,
      })
      if (result) {
        setDiscoverOverride(result.jobs)
        setDiscoveryResult({
          count: result.jobs.length,
          dataset: result.dataset_used,
          keywords,
        })
        setShowDiscoverDialog(false)
        setDiscoverKeywords('')
      }
    } catch (error) {
      console.error('Failed to discover jobs:', error)
      alert('Failed to discover jobs. Please try again.')
    }
  }, [discoverKeywords, selectedDataset, discoverMutation])

  const isInitialLoad = isLoading && projects.length === 0
  const isSearching = isFetching && !isInitialLoad

  return (
    <PageContainer ref={scrollContainerRef} className="space-y-6">
      <ProjectsHeader
        filters={filters}
        onFiltersChange={setFiltersState}
        onSearch={handleSearch}
        onOpenDiscover={() => setShowDiscoverDialog(true)}
        isSearching={isSearching}
      />

      {isInitialLoad ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <LoadingSkeleton lines={1} />
            <LoadingSkeleton lines={1} />
            <LoadingSkeleton lines={1} />
          </div>
          <CardListSkeleton count={5} />
        </div>
      ) : (
        <>
          <ProjectsStats stats={stats ?? null} />
          {discoveryResult && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-4 relative dark:border-green-900 dark:bg-green-950">
              <button
                onClick={() => setDiscoveryResult(null)}
                className="absolute top-2 right-2 text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-200"
              >
                ✕
              </button>
              <p className="text-sm font-medium text-green-800 dark:text-green-200">
                Found <span className="font-bold">{discoveryResult.count}</span> jobs in{' '}
                <span className="font-mono bg-green-100 px-1 rounded dark:bg-green-900">{discoveryResult.dataset}</span>
              </p>
            </div>
          )}
          <ProjectsResults
            projects={projects}
            isLoading={isFetching && projects.length === 0}
            searchHighlight={appliedFilters.search}
            onDiscoverClick={() => setShowDiscoverDialog(true)}
            reduceMotion={reduceMotion}
          />
        </>
      )}

      {showDiscoverDialog && (
        <DiscoverDialog
          isDiscovering={discoverMutation.isPending}
          keywords={discoverKeywords}
          setKeywords={setDiscoverKeywords}
          datasets={datasets}
          selectedDataset={selectedDataset}
          setSelectedDataset={setSelectedDataset}
          onDiscover={handleDiscoverJobs}
          onClose={() => setShowDiscoverDialog(false)}
        />
      )}
    </PageContainer>
  )
}
