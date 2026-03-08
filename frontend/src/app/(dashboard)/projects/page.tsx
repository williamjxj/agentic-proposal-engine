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
  useCreateManualProject,
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
import { cn } from '@/lib/utils'

type ProjectsTab = 'search' | 'chat' | 'discover'

interface PageProjectFilters {
  search: string
  skills: string[]
  platforms: string[]
  minBudget?: number
  maxBudget?: number
  category?: string
  startDate?: string
  endDate?: string
  applied?: boolean
  sortBy?: string
}

function toApiFilters(f: PageProjectFilters): ProjectFilters {
  return {
    search: f.search || undefined,
    skills: f.skills.length ? f.skills : undefined,
    platforms: f.platforms.length ? f.platforms : undefined,
    min_budget: f.minBudget,
    max_budget: f.maxBudget,
    category: f.category || undefined,
    start_date: f.startDate || undefined,
    end_date: f.endDate || undefined,
    applied: f.applied,
    sort_by: f.sortBy,
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

/** Memoized header/filters with tabs */
const ProjectsHeader = memo(function ProjectsHeader({
  activeTab,
  onTabChange,
  filters,
  onFiltersChange,
  onSearch,
  onOpenDiscover,
  isSearching,
}: {
  activeTab: ProjectsTab
  onTabChange: (t: ProjectsTab) => void
  filters: PageProjectFilters
  onFiltersChange: (f: PageProjectFilters) => void
  onSearch: () => void
  onOpenDiscover: () => void
  isSearching: boolean
}) {
  const [showAdvanced, setShowAdvanced] = useState(false)

  return (
    <>
      <PageHeader
        title="Projects"
        description="Discover freelance opportunities from HuggingFace datasets"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => (window as any).openManualUpload()}>
            Manual Upload
          </Button>
          <Button onClick={onOpenDiscover}>Discover Jobs</Button>
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-700 mb-4">
        {[
          { id: 'search', label: 'Search Projects' },
          { id: 'chat', label: 'AI Chat' },
          { id: 'discover', label: 'External Discovery' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => onTabChange(tab.id as ProjectsTab)}
            className={cn(
              'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
              activeTab === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {activeTab === 'discover' ? (
          <p className="text-sm text-muted-foreground py-2">
            Click <strong>Discover Jobs</strong> above to fetch new jobs from HuggingFace with custom keywords.
          </p>
        ) : activeTab === 'chat' ? (
          <p className="text-sm text-muted-foreground py-2">
            Ask our AI about projects, skills in demand, or help matching your profile.
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Input
                  type="text"
                  placeholder="Search projects (e.g. python, fastapi)..."
                  value={filters.search}
                  onChange={(e) => onFiltersChange({ ...filters, search: e.target.value })}
                  onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowAdvanced(!showAdvanced)}>
                  {showAdvanced ? 'Hide Filters' : 'Advanced Filters'}
                </Button>
                <Button onClick={onSearch} disabled={isSearching}>
                  {isSearching ? 'Searching...' : 'Search'}
                </Button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <p className="text-xs text-muted-foreground self-center mr-1 font-medium italic">Popular:</p>
              {['Python', 'FastAPI', 'React', 'Agentic AI', 'Scraping'].map((kw) => (
                <Badge
                  key={kw}
                  variant="secondary"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-all duration-200 border-primary/10"
                  onClick={() => {
                    onFiltersChange({ ...filters, search: kw })
                    // Small delay to ensure state update before search if needed,
                    // though handler will use current closure val normally
                    setTimeout(onSearch, 0)
                  }}
                >
                  {kw}
                </Badge>
              ))}
            </div>

            {showAdvanced && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700"
              >
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase text-muted-foreground">Category</label>
                  <select
                    className="w-full text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5"
                    value={filters.category || ''}
                    onChange={(e) => onFiltersChange({ ...filters, category: e.target.value })}
                  >
                    <option value="">All Categories</option>
                    <option value="development">Development</option>
                    <option value="design">Design</option>
                    <option value="writing">Writing</option>
                    <option value="marketing">Marketing</option>
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
                  <div className="flex gap-2">
                    <Input
                      type="date"
                      className="h-8 text-[10px]"
                      value={filters.startDate || ''}
                      onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
                    />
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        )}
      </div>
    </>
  )
})

/** AI/trending skills for badge styling (Upwork 2025 in-demand) */
const AI_TRENDING_SKILLS = new Set([
  'python', 'ai', 'machine learning', 'llm', 'langchain', 'agentic',
  'generative ai', 'deep learning', 'data science', 'chatbot', 'nlp',
  'tensorflow', 'pytorch', 'automation', 'scripting', 'react', 'fastapi',
])

/** Stats section - redesigned for AI/freelance trends 2025 */
function ProjectsStats({ stats }: { stats: ProjectStats | null }) {
  if (!stats) return null

  const topSkill =
    stats.top_in_demand_skill ??
    (stats.by_skill && Object.keys(stats.by_skill).length > 0
      ? Object.entries(stats.by_skill)
          .sort((a, b) => b[1] - a[1])[0]?.[0]
          ?.replace(/^\w/, (c) => c.toUpperCase()) ?? 'N/A'
      : 'N/A')
  const isAiSkill = typeof topSkill === 'string'
    && AI_TRENDING_SKILLS.has(topSkill.toLowerCase())
  const dataSource =
    stats.data_source ||
    (stats.by_platform && Object.keys(stats.by_platform).length > 0 ? 'HuggingFace' : null) ||
    '—'
  const avgBudget = stats.avg_budget != null && stats.avg_budget > 0
    ? `$${Math.round(stats.avg_budget).toLocaleString()}`
    : null

  return (
    <div
      className={cn(
        'grid gap-4',
        avgBudget ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3'
      )}
    >
      <StatsCard
        title="Total Opportunities"
        value={stats.total_jobs || 0}
        tip="Projects currently available from your data sources"
      />
      <StatsCard
        title="Data Source"
        value={dataSource}
        tip="Where job data comes from (HuggingFace datasets, or live platforms when enabled)"
      />
      <StatsCard
        title="Top In-Demand Skill"
        value={topSkill}
        tip="Most relevant skill in current listings. Prioritizes AI, Python, and modern dev skills—aligned with 2025 freelance trends."
        highlight={isAiSkill}
      />
      {avgBudget && (
        <StatsCard
          title="Avg. Budget"
          value={avgBudget}
          tip="Average project budget across listed opportunities"
        />
      )}
    </div>
  )
}

function StatsCard({
  title,
  value,
  tip,
  highlight = false,
}: {
  title: string
  value: string | number
  tip?: string
  highlight?: boolean
}) {
  return (
    <div
      className={cn(
        'group relative rounded-xl border p-5 shadow-sm transition-all duration-300 hover:shadow-md',
        highlight
          ? 'border-primary/40 bg-primary/5 dark:bg-primary/10 dark:border-primary/30'
          : 'border-slate-200 bg-white hover:border-primary/30 dark:border-slate-800 dark:bg-slate-900/50'
      )}
    >
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
      <p
        className={cn(
          'text-2xl font-bold tracking-tight',
          typeof value === 'number'
            ? 'bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent'
            : highlight
              ? 'text-primary'
              : 'text-foreground'
        )}
      >
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
  pagination,
  onPageChange,
}: {
  projects: Project[]
  isLoading: boolean
  searchHighlight: string
  onDiscoverClick: () => void
  reduceMotion: boolean
  pagination?: {
    page: number
    pages: number
    total: number
  }
  onPageChange: (page: number) => void
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
            <ProjectCard project={project} highlight={searchHighlight} />
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

function ProjectCard({ project, highlight }: { project: Project; highlight: string }) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)

  const handleGenerateProposal = (e: React.MouseEvent) => {
    e.stopPropagation()
    const projectId = project.id || (project as { external_id?: string }).external_id || ''
    if (projectId) {
      try {
        sessionStorage.setItem(`proposal_job_${projectId}`, JSON.stringify(project))
      } catch (_) {
        // Ignore quota/private mode errors
      }
    }
    router.push(`/proposals/new?jobId=${encodeURIComponent(projectId)}`)
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
              {(project as { source?: string }).source && (
                <Badge variant="outline" className="text-xs shrink-0" title={`Source: ${(project as { source?: string }).source}`}>
                  {(project as { source?: string }).source?.includes('freelancer') ? 'Freelancer' : 'HuggingFace'}
                </Badge>
              )}
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
        <Button onClick={handleGenerateProposal}>
          Generate Proposal
        </Button>
      </CardFooter>
    </Card>
  )
}

function ChatSection() {
  const [messages, setMessages] = useState<{ role: 'user' | 'ai'; content: string }[]>([
    { role: 'ai', content: 'Hello! I can help you search projects, analyze your skills, or suggest matches. What would you like to know?' }
  ])
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const handleSend = async () => {
    if (!input.trim() || isTyping) return

    const userMsg = input
    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: userMsg }])
    setIsTyping(true)

    try {
      const { chatWithProjects } = await import('@/lib/api/client')
      const result = await chatWithProjects(userMsg)

      setMessages(prev => [...prev, { role: 'ai', content: result?.response || "I'm sorry, I couldn't process that." }])
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', content: "Error connecting to AI service." }])
    } finally {
      setIsTyping(false)
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  return (
    <Card className="flex flex-col h-[600px] shadow-lg border-primary/20 bg-white dark:bg-slate-900">
      <CardHeader className="border-b bg-slate-50/50 dark:bg-slate-800/50">
        <div className="flex items-center gap-2">
          <span className="text-2xl">🤖</span>
          <div>
            <h3 className="font-bold text-lg">Project Assistant</h3>
            <p className="text-xs text-muted-foreground">Ask anything about the current job market</p>
          </div>
        </div>
      </CardHeader>
      <CardContent ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm shadow-sm ${m.role === 'user'
              ? 'bg-primary text-primary-foreground rounded-tr-none'
              : 'bg-slate-100 dark:bg-slate-800 text-foreground rounded-tl-none border border-slate-200 dark:border-slate-700'
              }`}>
              {m.content}
            </div>
          </div>
        ))}
        {isTyping && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none px-4 py-3 text-sm animate-pulse">
              AI is thinking...
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="border-t p-4 flex gap-2 bg-slate-50/50 dark:bg-slate-800/50">
        <Input
          placeholder="Ask about python jobs, market trends..."
          value={input}
          className="bg-white dark:bg-slate-900"
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <Button onClick={handleSend} disabled={isTyping} className="shrink-0 shadow-sm">Send</Button>
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
            className="flex-1 rounded-md bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 min-h-[44px] sm:min-h-0"
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
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground p-1" aria-label="Close">
            ✕
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
            className="flex-1"
            onClick={() => onSubmit({
              ...formData,
              skills: formData.skills.split(',').map(s => s.trim()).filter(Boolean),
              budget_min: formData.budget_min ? parseFloat(formData.budget_min) : null,
              budget_max: formData.budget_max ? parseFloat(formData.budget_max) : null,
            })}
            disabled={isSubmitting || !formData.title || !formData.description}
          >
            {isSubmitting ? 'Uploading...' : 'Upload Project'}
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
    category: savedFilters.category || '',
    applied: savedFilters.applied || false,
    sortBy: savedFilters.sortBy || 'date',
  })
  const [appliedFilters, setAppliedFilters] = useState<PageProjectFilters>(() => ({
    search: savedFilters.search || '',
    skills: savedFilters.skills || [],
    platforms: savedFilters.platforms || [],
    minBudget: savedFilters.minBudget,
    maxBudget: savedFilters.maxBudget,
    category: savedFilters.category || '',
    applied: savedFilters.applied || false,
    sortBy: savedFilters.sortBy || 'date',
  }))
  const [showDiscoverDialog, setShowDiscoverDialog] = useState(false)
  const [discoverKeywords, setDiscoverKeywords] = useState('')
  const [selectedDataset, setSelectedDataset] = useState('')
  const [discoveryResult, setDiscoveryResult] = useState<{ count: number; dataset: string; keywords: string[] } | null>(null)
  const [activeTab, setActiveTab] = useState<ProjectsTab>('search')
  const [showManualUpload, setShowManualUpload] = useState(false)

  const apiLimit = 50
  const apiOffset = (currentPage - 1) * apiLimit
  const apiFilters = toApiFilters(appliedFilters)
  const { data: projectsData, isLoading, isFetching, refetch } = useProjects(apiFilters, apiLimit, apiOffset)
  const { data: stats } = useProjectStats()
  const { data: datasets = [] } = useProjectDatasets()
  const discoverMutation = useDiscoverProjects()
  const manualUploadMutation = useCreateManualProject()

  // Expose dialog opener to header
  useEffect(() => {
    ;(window as any).openManualUpload = () => setShowManualUpload(true)
    return () => { delete (window as any).openManualUpload }
  }, [])

  const [discoverOverride, setDiscoverOverride] = useState<Project[] | null>(null)
  const projects = discoverOverride ?? projectsData?.jobs ?? []

  const handleSearch = useCallback(() => {
    setDiscoverOverride(null)
    setAppliedFilters(filters)
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
        activeTab={activeTab}
        onTabChange={setActiveTab}
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

          {activeTab === 'chat' ? (
            <ChatSection />
          ) : (
            <ProjectsResults
              projects={projects}
              isLoading={isFetching && projects.length === 0}
              searchHighlight={appliedFilters.search}
              onDiscoverClick={() => setShowDiscoverDialog(true)}
              reduceMotion={reduceMotion}
              pagination={projectsData ? {
                page: projectsData.page,
                pages: projectsData.pages,
                total: projectsData.total
              } : undefined}
              onPageChange={(p) => setCurrentPage(p)}
            />
          )}
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
