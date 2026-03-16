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
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { useSessionState } from '@/hooks/useSessionState'
import {
  useProjects,
  useProjectDatasets,
  useDiscoverProjects,
  useCreateManualProject,
  useAppliedJobIds,
} from '@/hooks/useProjects'
import type { ProjectFilters } from '@/lib/api/client'
import type { Project, DatasetInfo } from '@/lib/api/client'
import { deleteManualProject } from '@/lib/api/client'
import { LoadingSkeleton, CardListSkeleton } from '@/components/workflow/progress-overlay'
import { PageHeader } from '@/components/shared/page-header'
import { PageContainer } from '@/components/shared/page-container'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { EmptyState } from '@/components/shared/empty-state'
import { useReduceMotion } from '@/hooks/useReduceMotion'
import { cn } from '@/lib/utils'
import { Search, Sparkles, FilePlus, X, Upload, Loader2, Trash2, Info } from 'lucide-react'

interface PageProjectFilters {
  search: string
  skills: string[]
  platforms: string[]
  minBudget?: number
  maxBudget?: number
  startDate?: string
  endDate?: string
  applied?: boolean
  sortBy?: string
  datasetId?: string
}

function toApiFilters(f: PageProjectFilters): ProjectFilters {
  return {
    search: f.search || undefined,
    skills: f.skills.length ? f.skills : undefined,
    platforms: f.platforms.length ? f.platforms : undefined,
    min_budget: f.minBudget,
    max_budget: f.maxBudget,
    start_date: f.startDate || undefined,
    end_date: f.endDate || undefined,
    applied: f.applied,
    sort_by: f.sortBy,
    dataset_id: f.datasetId || undefined,
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

/** Projects toolbar: search, filters, and add-project actions */
const ProjectsHeader = memo(function ProjectsHeader({
  filters,
  onFiltersChange,
  onSearch,
  onOpenDiscover,
  onOpenManualUpload,
  isSearching,
  datasets,
}: {
  filters: PageProjectFilters
  onFiltersChange: (f: PageProjectFilters) => void
  onSearch: (filterOverride?: PageProjectFilters) => void
  onOpenDiscover: () => void
  onOpenManualUpload: () => void
  isSearching: boolean
  datasets: DatasetInfo[]
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <div className="space-y-4">
      <PageHeader
        title="Projects"
        description="Search and discover freelance opportunities from HuggingFace datasets"
      />

      {/* Unified toolbar: search + filters + add-project actions in one row */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/30 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-48 sm:w-64 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              type="text"
              placeholder="Search keywords..."
              value={filters.search}
              onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              className="pl-9 h-8 text-sm bg-white dark:bg-slate-900"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm border border-slate-200 bg-white hover:border-primary/30 dark:border-slate-800 dark:bg-slate-900/50 shrink-0"
          >
            {showAdvanced ? 'Hide' : 'Filters'}
          </button>
          <button
            type="button"
            onClick={() => onSearch()}
            disabled={isSearching}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium border border-primary/40 bg-primary/5 text-primary hover:bg-primary/10 dark:bg-primary/10 dark:border-primary/30 shrink-0 disabled:opacity-50"
          >
            {isSearching ? 'Searching...' : 'Search'}
          </button>
          <div className="inline-flex items-center gap-1">
            <select
              className="h-8 text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 shrink-0 max-w-[200px] truncate"
              value={filters.datasetId || datasets[0]?.id || ''}
              onChange={(e) => {
                const newFilters = { ...filters, datasetId: e.target.value }
                onFiltersChange(newFilters)
                onSearch(newFilters)
              }}
              title="Select Data Source"
            >
              {datasets.map(d => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
            <div className="group relative shrink-0">
              <span className="inline-flex cursor-help text-muted-foreground hover:text-foreground">
                <Info className="h-4 w-4" />
              </span>
              <span
                className="absolute left-1/2 bottom-full -translate-x-1/2 mb-2 invisible group-hover:visible z-50 w-64 p-2.5 bg-slate-900 text-white text-[11px] leading-relaxed rounded-lg shadow-xl text-left whitespace-normal"
                role="tooltip"
              >
                {(() => {
                  const currentId = filters.datasetId || datasets[0]?.id
                  const currentDs = datasets.find((d) => d.id === currentId)
                  const id = currentDs?.id ?? currentId ?? '—'
                  const name = currentDs?.name ?? id
                  const href = id !== '—' && !id.includes('freelancer') && !id.includes('manual')
                    ? `https://huggingface.co/datasets/${id}`
                    : null
                  return (
                    <>
                      <span className="font-medium">Dataset Resource</span>
                      <p className="mt-1">{name}</p>
                      <p className="text-slate-300 font-mono text-[10px]">{id}</p>
                      {href && (
                        <a
                          href={href}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="mt-1.5 inline-block text-primary hover:underline text-[10px]"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View on HuggingFace →
                        </a>
                      )}
                    </>
                  )
                })()}
                <span className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-slate-900" />
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onOpenDiscover}
            title="Fetch new jobs from HuggingFace with custom keywords"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm border border-slate-200 bg-white hover:border-primary/30 dark:border-slate-800 dark:bg-slate-900/50 shrink-0"
          >
            <Sparkles className="h-4 w-4 shrink-0" />
            Discover
          </button>
          <button
            type="button"
            onClick={onOpenManualUpload}
            title="Create a project by entering details manually"
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm border border-slate-200 bg-white hover:border-primary/30 dark:border-slate-800 dark:bg-slate-900/50 shrink-0"
          >
            <FilePlus className="h-4 w-4 shrink-0" />
            Add manually
          </button>
        </div>

        {showAdvanced && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4"
          >
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Source Platform</label>
              <select
                className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5"
                value={filters.platforms[0] || ''}
                onChange={(e) =>
                  onFiltersChange({
                    ...filters,
                    platforms: e.target.value ? [e.target.value] : [],
                  })
                }
              >
                <option value="">All Sources</option>
                <option value="huggingface_dataset">HuggingFace</option>
                <option value="freelancer">Freelancer</option>
                <option value="upwork">Upwork</option>
                <option value="linkedin">LinkedIn</option>
                <option value="remoteok">RemoteOK</option>
                <option value="remotive">Remotive</option>
                <option value="manual">Manual</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Sort By</label>
              <select
                className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5"
                value={filters.sortBy || 'date'}
                onChange={(e) => onFiltersChange({ ...filters, sortBy: e.target.value })}
              >
                <option value="date">Newest First</option>
                <option value="category">Category</option>
                <option value="budget">Budget (High to Low)</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Applied Status</label>
              <div className="flex items-center gap-2 pt-1.5">
                <input
                  type="checkbox"
                  id="applied-filter"
                  checked={filters.applied || false}
                  onChange={(e) => onFiltersChange({ ...filters, applied: e.target.checked })}
                  className="rounded border-slate-300"
                />
                <label htmlFor="applied-filter" className="text-sm">Only Applied</label>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-semibold uppercase text-muted-foreground">Date Range</label>
              <Input
                type="date"
                className="h-8 text-sm"
                value={filters.startDate || ''}
                onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
              />
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
})

/** AI/trending skills for badge styling (Upwork 2025 in-demand) */
const AI_TRENDING_SKILLS = new Set([
  'python', 'ai', 'machine learning', 'llm', 'langchain', 'agentic',
  'generative ai', 'deep learning', 'data science', 'chatbot', 'nlp',
  'tensorflow', 'pytorch', 'automation', 'scripting', 'react', 'fastapi',
])

function getSourceLabel(
  project: Project,
  datasets: DatasetInfo[]
): string {
  const platform = (project.platform || '').toLowerCase()
  const source = (project as { source?: string }).source || ''

  if (platform === 'manual') return 'Manual'
  if (platform === 'freelancer' || source.includes('freelancer')) return 'Freelancer'

  const ds = datasets.find((d) => d.id === source)
  return ds?.name ?? (source || 'HuggingFace')
}

/** Results area - only this section shows loading/refreshing */
const ProjectsResults = memo(function ProjectsResults({
  projects,
  datasets,
  isLoading,
  searchHighlight,
  appliedJobIds = [],
  onDiscoverClick,
  reduceMotion,
  pagination,
  onPageChange,
  onManualDeleted,
}: {
  projects: Project[]
  datasets: DatasetInfo[]
  isLoading: boolean
  searchHighlight: string
  appliedJobIds?: string[]
  onDiscoverClick: () => void
  reduceMotion: boolean
  pagination?: {
    page: number
    pages: number
    total: number
  }
  onPageChange: (page: number) => void
  onManualDeleted: () => void
}) {
  if (isLoading) {
    return <CardListSkeleton count={5} />
  }
  if (projects.length === 0) {
    return (
      <EmptyState
        title="No projects found"
        description="No projects match your keywords or search. Try adjusting keywords at /keywords, widening your search, or discovering new jobs from HuggingFace."
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
    <div className="space-y-6">
      <motion.div
        className="grid gap-6"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        custom={reduceMotion}
      >
        {projects.map((project, i) => (
          <motion.div
            key={`${project.id ?? (project as { external_id?: string }).external_id ?? 'p'}-${i}`}
            variants={itemVariants}
            custom={reduceMotion}
          >
            <ProjectCard
              project={project}
              datasets={datasets}
              highlight={searchHighlight}
              appliedJobIds={appliedJobIds}
              onManualDeleted={onManualDeleted}
            />
          </motion.div>
        ))}
      </motion.div>

      {pagination && pagination.pages > 1 && (
        <div className="flex items-center justify-between border-t border-slate-200 dark:border-slate-800 pt-6">
          <p className="text-sm text-muted-foreground">
            Showing <span className="font-medium">{projects.length}</span> of{' '}
            <span className="font-medium">{pagination.total}</span> projects
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page <= 1}
              onClick={() => onPageChange(pagination.page - 1)}
            >
              Previous
            </Button>
            <div className="flex items-center px-4 text-sm font-medium">
              Page {pagination.page} of {pagination.pages}
            </div>
            <Button
              variant="outline"
              size="sm"
              disabled={pagination.page >= pagination.pages}
              onClick={() => onPageChange(pagination.page + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
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

function ProjectCard({
  project,
  datasets,
  highlight,
  appliedJobIds = [],
  onManualDeleted,
}: {
  project: Project
  datasets: DatasetInfo[]
  highlight: string
  appliedJobIds?: string[]
  onManualDeleted: () => void
}) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [isDeletingManual, setIsDeletingManual] = useState(false)
  const projectId = project.id || (project as { external_id?: string }).external_id || ''
  const hasApplied = projectId && appliedJobIds.includes(projectId)
  const isManualProject = (project.platform || '').toLowerCase() === 'manual'

  const handleGenerateProposal = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (hasApplied) return
    if (projectId) {
      try {
          localStorage.setItem(`proposal_job_${projectId}`, JSON.stringify(project))
      } catch (_) {
        // Ignore quota/private mode errors
      }
    }
    router.push(`/proposals/new?jobId=${encodeURIComponent(projectId)}`)
  }

  const handleViewProposal = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (projectId) {
      router.push(`/proposals/new?jobId=${encodeURIComponent(projectId)}`)
      return
    }
    router.push('/proposals')
  }

  const handleDeleteManual = async (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!projectId || !isManualProject) return
    if (!confirm('Delete this manually added project?')) return

    try {
      setIsDeletingManual(true)
      await deleteManualProject(projectId)
      onManualDeleted()
    } catch (error) {
      console.error('Failed to delete manual project:', error)
      alert('Failed to delete manual project. Please try again.')
    } finally {
      setIsDeletingManual(false)
    }
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
              {hasApplied && (
                <Badge variant="outline" className="shrink-0 border-green-500/50 text-green-700 dark:text-green-400">
                  Applied
                </Badge>
              )}
              <Badge variant="outline" className="shrink-0" title={(project as { source?: string }).source}>
                {getSourceLabel(project, datasets)}
              </Badge>
            </div>
            <p className="text-sm font-medium text-muted-foreground mt-1 flex items-center gap-1.5">
              🏢 <HighlightText text={project.company} highlight={highlight} />
            </p>
            {project.test_email && (
              <p className="text-xs font-medium text-blue-600 dark:text-blue-400 mt-0.5 flex items-center gap-1.5">
                📧 Test Email: <HighlightText text={project.test_email} highlight={highlight} />
              </p>
            )}
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
      <CardContent className="pt-0">
        {expanded ? (
          <div className="space-y-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {project.description}
              </ReactMarkdown>
            </div>
            {(project as any).model_response && (
              <div className="mt-4 pt-4 border-t border-slate-200 dark:border-slate-700">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {(project as any).model_response}
                  </ReactMarkdown>
                </div>
              </div>
            )}
            <button
              onClick={() => setExpanded(false)}
              className="text-xs text-primary mt-2 font-medium hover:underline"
            >
              ▲ Show less
            </button>
          </div>
        ) : (
          <div className="cursor-pointer" onClick={() => setExpanded(true)}>
            <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
              <HighlightText text={project.description} highlight={highlight} />
            </p>
            <p className="text-xs text-primary mt-1 font-medium">
              ▼ View Details
            </p>
          </div>
        )}
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

        <div className="flex items-center gap-2">
          {isManualProject && (
            <Button
              variant="outline"
              onClick={handleDeleteManual}
              disabled={isDeletingManual}
              title="Delete manually added project"
            >
              <Trash2 className="h-4 w-4 mr-1" />
              {isDeletingManual ? 'Deleting...' : 'Delete'}
            </Button>
          )}

          {hasApplied ? (
            <Button variant="outline" onClick={handleViewProposal} title="You have an in-progress draft for this job — click to continue editing">
              Continue Draft
            </Button>
          ) : (
            <Button onClick={handleGenerateProposal}>
              Generate Proposal
            </Button>
          )}
        </div>
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
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 -mr-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close" title="Close">
            <X className="h-5 w-5" />
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
            className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5"
          >
            {isDiscovering ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Discovering...
              </>
            ) : (
              <>
                <Search className="h-4 w-4" />
                Discover
              </>
            )}
          </button>
          <button
            onClick={onClose}
            disabled={isDiscovering}
            className="flex-1 rounded-md bg-slate-200 px-4 py-2.5 text-sm font-medium hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 disabled:opacity-50 min-h-[44px] sm:min-h-0 flex items-center justify-center gap-1.5"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

function ManualUploadDialog({
  isOpen,
  onClose,
  onSubmit,
  isSubmitting,
}: {
  isOpen: boolean
  onClose: () => void
  onSubmit: (data: any) => void
  isSubmitting: boolean
}) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    company: '',
    skills: '',
    budget_min: '',
    budget_max: '',
    budget_type: 'fixed',
    test_email: '',
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto my-auto border border-slate-200 dark:border-slate-800 shadow-xl">
        <div className="flex items-start justify-between mb-4">
          <h2 className="text-xl font-bold">Manual Project Upload</h2>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close" title="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Project Title</label>
            <Input
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
              placeholder="e.g. Senior Python Developer for Agentic AI"
            />
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Description</label>
            <textarea
              className="min-h-[100px] w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 focus:ring-2 focus:ring-primary outline-none transition-all"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
              placeholder="Provide a detailed project description for better AI matching..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Company/Client</label>
              <Input
                value={formData.company}
                onChange={e => setFormData({...formData, company: e.target.value})}
                placeholder="Client Name"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Test Email (Optional)</label>
              <Input
                value={formData.test_email}
                onChange={e => setFormData({...formData, test_email: e.target.value})}
                placeholder="test@example.com"
                type="email"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium">Skills (comma-separated)</label>
            <Input
              value={formData.skills}
              onChange={e => setFormData({...formData, skills: e.target.value})}
              placeholder="Python, OpenAI, React"
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="grid gap-2">
              <label className="text-sm font-medium">Min Budget</label>
              <Input
                type="number"
                value={formData.budget_min}
                onChange={e => setFormData({...formData, budget_min: e.target.value})}
                placeholder="50"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Max Budget</label>
              <Input
                type="number"
                value={formData.budget_max}
                onChange={e => setFormData({...formData, budget_max: e.target.value})}
                placeholder="500"
              />
            </div>
            <div className="grid gap-2">
              <label className="text-sm font-medium">Type</label>
              <select
                className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950 focus:ring-2 focus:ring-primary outline-none transition-all"
                value={formData.budget_type}
                onChange={e => setFormData({...formData, budget_type: e.target.value})}
              >
                <option value="fixed">Fixed</option>
                <option value="hourly">Hourly</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <Button
            className="flex-1 flex items-center justify-center gap-1.5"
            onClick={() => onSubmit({
              ...formData,
              skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
              budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
              budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
            })}
            disabled={isSubmitting || !formData.title || !formData.description}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                Upload Project
              </>
            )}
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>Cancel</Button>
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
  const [currentPage, setCurrentPage] = useState(1)
  const [filters, setFiltersState] = useState<PageProjectFilters>({
    search: savedFilters.search || '',
    skills: savedFilters.skills || [],
    platforms: savedFilters.platforms || [],
    minBudget: savedFilters.minBudget,
    maxBudget: savedFilters.maxBudget,
    applied: savedFilters.applied || false,
    sortBy: savedFilters.sortBy || 'date',
    datasetId: savedFilters.datasetId || '',
  })
  const [appliedFilters, setAppliedFilters] = useState<PageProjectFilters>(() => ({
    search: savedFilters.search || '',
    skills: savedFilters.skills || [],
    platforms: savedFilters.platforms || [],
    minBudget: savedFilters.minBudget,
    maxBudget: savedFilters.maxBudget,
    applied: savedFilters.applied || false,
    sortBy: savedFilters.sortBy || 'date',
    datasetId: savedFilters.datasetId || '',
  }))
  const [showDiscoverDialog, setShowDiscoverDialog] = useState(false)
  const [discoverKeywords, setDiscoverKeywords] = useState('')
  const [selectedDataset, setSelectedDataset] = useState('')
  const [discoveryResult, setDiscoveryResult] = useState<{ count: number; dataset: string; keywords: string[] } | null>(null)
  const [showManualUpload, setShowManualUpload] = useState(false)

  const apiLimit = 50
  const apiOffset = (currentPage - 1) * apiLimit
  const apiFilters = toApiFilters(appliedFilters)
  const { data: projectsData, isLoading, isFetching, refetch } = useProjects(apiFilters, apiLimit, apiOffset)
  const { data: datasets = [] } = useProjectDatasets()
  const { data: appliedJobIds = [] } = useAppliedJobIds()
  const discoverMutation = useDiscoverProjects()
  const manualUploadMutation = useCreateManualProject()

  const [discoverOverride, setDiscoverOverride] = useState<Project[] | null>(null)
  const projects = discoverOverride ?? projectsData?.jobs ?? []

  const handleSearch = useCallback((filterOverride?: PageProjectFilters) => {
    setDiscoverOverride(null)
    // Only use override when it's a valid filter object (from Popular badge), not a click event
    const filtersToApply =
      filterOverride &&
      typeof filterOverride === 'object' &&
      'search' in filterOverride
        ? filterOverride
        : filters
    setAppliedFilters(filtersToApply)
    setCurrentPage(1)
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

  const handleManualUpload = useCallback(async (data: any) => {
    try {
      const result = await manualUploadMutation.mutateAsync(data)
      if (result) {
        setShowManualUpload(false)
        refetch() // Refresh the list
      }
    } catch (error) {
      console.error('Failed to upload project:', error)
      alert('Failed to upload project. Please try again.')
    }
  }, [manualUploadMutation, refetch])

  const isInitialLoad = isLoading && projects.length === 0
  const isSearching = isFetching && !isInitialLoad

  return (
    <PageContainer ref={scrollContainerRef} className="space-y-6">
      <ProjectsHeader
        filters={filters}
        onFiltersChange={setFiltersState}
        onSearch={handleSearch}
        onOpenDiscover={() => setShowDiscoverDialog(true)}
        onOpenManualUpload={() => setShowManualUpload(true)}
        isSearching={isSearching}
        datasets={datasets}
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
              datasets={datasets}
              isLoading={isFetching && projects.length === 0}
              searchHighlight={appliedFilters.search}
              appliedJobIds={appliedJobIds}
              onDiscoverClick={() => setShowDiscoverDialog(true)}
              reduceMotion={reduceMotion}
              pagination={projectsData ? {
                page: projectsData.page,
                pages: projectsData.pages,
                total: projectsData.total
              } : undefined}
              onPageChange={(p) => setCurrentPage(p)}
              onManualDeleted={() => {
                setDiscoverOverride(null)
                refetch()
              }}
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

      {showManualUpload && (
        <ManualUploadDialog
          isOpen={showManualUpload}
          isSubmitting={manualUploadMutation.isPending}
          onSubmit={handleManualUpload}
          onClose={() => setShowManualUpload(false)}
        />
      )}
    </PageContainer>
  )
}
