/**
 * Proposals Page
 *
 * Lists user proposals with tabs, filters and delete functionality.
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionState } from '@/hooks/useSessionState'
import { useNavigationTiming } from '@/hooks/useNavigationTiming'
import { LoadingSkeleton, CardListSkeleton } from '@/components/workflow/progress-overlay'
import { PageHeader } from '@/components/shared/page-header'
import { PageContainer } from '@/components/shared/page-container'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Trash2, Search, Filter, Calendar, DollarSign, Clock, Briefcase, Check, Edit, Award, X } from 'lucide-react'
import { deleteProposal } from '@/lib/api/client'
import { useToast } from '@/lib/toast/toast-context'
import { cn } from '@/lib/utils'

interface ProposalFilters {
  search: string
  status: string
  sortBy: string
  platform: string
}

const STATUS_TABS = [
  { id: 'all', label: 'All' },
  { id: 'draft', label: 'Drafts' },
  { id: 'submitted', label: 'Submitted' },
  { id: 'won', label: 'Won' },
  { id: 'lost', label: 'Lost' },
  { id: 'archived', label: 'Archived' },
]

export default function ProposalsPage() {
  const router = useRouter()
  const toast = useToast()
  const { getFilters, setFilters, getScrollPosition, setScrollPosition, updateActiveEntity } = useSessionState()
  const { measureOperation } = useNavigationTiming()
  const [isLoading, setIsLoading] = useState(true)
  const [proposals, setProposals] = useState<any[]>([])
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Get saved filters from session state
  const savedFilters = getFilters<ProposalFilters>()
  const [filters, setLocalFilters] = useState<ProposalFilters>({
    search: savedFilters.search || '',
    status: savedFilters.status || 'all',
    sortBy: savedFilters.sortBy || 'created',
    platform: savedFilters.platform || 'all',
  })

  // Load data
  const loadData = async () => {
    setIsLoading(true)
    try {
      await measureOperation('load-proposals', async () => {
        const { listProposals } = await import('@/lib/api/client')

        const statusFilter = filters.status === 'all' ? undefined : filters.status
        const response = await listProposals(statusFilter, 100, 0)

        let filtered = response.proposals

        // Apply Search
        if (filters.search) {
          const searchLower = filters.search.toLowerCase()
          filtered = filtered.filter(p =>
            p.title.toLowerCase().includes(searchLower) ||
            (p.description && p.description.toLowerCase().includes(searchLower))
          )
        }

        // Apply Platform Filter
        if (filters.platform !== 'all') {
          filtered = filtered.filter(p => p.job_platform?.toLowerCase() === filters.platform.toLowerCase())
        }

        // Apply Sorting
        const sorted = [...filtered].sort((a, b) => {
          switch (filters.sortBy) {
            case 'created':
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
            case 'updated':
              return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
            case 'title':
              return a.title.localeCompare(b.title)
            default:
              return 0
          }
        })

        setProposals(sorted)
      })
    } catch (error) {
      console.error('Error loading proposals:', error)
      setProposals([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [filters.status, filters.sortBy, filters.platform]) // Reload on key filter changes

  // Restoring scroll position
  useEffect(() => {
    if (!isLoading && scrollContainerRef.current) {
      const savedPosition = getScrollPosition('/proposals')
      if (savedPosition > 0) {
        scrollContainerRef.current.scrollTop = savedPosition
      }
    }
  }, [isLoading])

  // Save filters when they change
  useEffect(() => {
    setFilters(filters)
  }, [filters, setFilters])

  const handleProposalClick = (proposalId: string) => {
    updateActiveEntity('proposal', proposalId)
    router.push(`/proposals/${proposalId}`)
  }

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    if (!confirm('Are you sure you want to delete this proposal?')) return

    setIsDeleting(id)
    try {
      await deleteProposal(id)
      toast.success('Proposal deleted')
      setProposals(prev => prev.filter(p => p.id !== id))
    } catch (error) {
      toast.error('Failed to delete')
    } finally {
      setIsDeleting(null)
    }
  }

  const handleNewProposal = () => {
    router.push('/proposals/new')
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader title="Proposals" description="Manage your AI-powered proposals" />
        <div className="space-y-6">
          <LoadingSkeleton lines={1} />
          <CardListSkeleton count={5} />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer ref={scrollContainerRef} className="space-y-6 pb-20">
      <PageHeader title="Proposals" description="Manage and track your proposal workflow">
        <Button onClick={handleNewProposal} className="shimmer-button">New Proposal</Button>
      </PageHeader>

      {/* Tabs with premium styling */}
      <div className="flex items-center gap-1 border-b border-slate-200 dark:border-slate-800 overflow-x-auto no-scrollbar">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setLocalFilters({ ...filters, status: tab.id })}
            className={cn(
              "px-4 py-3 text-sm font-medium transition-all relative whitespace-nowrap",
              filters.status === tab.id
                ? "text-primary border-b-2 border-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
            {filters.status === tab.id && (
              <span className="absolute -bottom-[2px] left-0 w-full h-[2px] bg-primary animate-in fade-in slide-in-from-left-2 duration-300" />
            )}
          </button>
        ))}
      </div>

      {/* Advanced Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by title or description..."
            value={filters.search}
            onChange={(e) => setLocalFilters({ ...filters, search: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && loadData()}
            className="pl-10 h-10 bg-white dark:bg-slate-900"
          />
        </div>

        <div className="flex gap-2 w-full lg:w-auto">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <select
              value={filters.platform}
              onChange={(e) => setLocalFilters({ ...filters, platform: e.target.value })}
              className="bg-transparent border-none outline-none focus:ring-0 cursor-pointer min-w-[100px]"
            >
              <option value="all">Platforms</option>
              <option value="upwork">Upwork</option>
              <option value="freelancer">Freelancer</option>
              <option value="huggingface">HuggingFace</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border text-sm bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <select
              value={filters.sortBy}
              onChange={(e) => setLocalFilters({ ...filters, sortBy: e.target.value })}
              className="bg-transparent border-none outline-none focus:ring-0 cursor-pointer min-w-[100px]"
            >
              <option value="created">Newest First</option>
              <option value="updated">Recently Updated</option>
              <option value="title">By Title</option>
            </select>
          </div>
        </div>
      </div>

      {/* Proposals list with premium card styling */}
      <div className="grid gap-4">
        {proposals.length === 0 ? (
          <EmptyState
            title="No proposals matching filters"
            description="Try adjusting your search or filters to find what you're looking for."
            icon={<Briefcase className="h-10 w-10 text-muted-foreground" />}
            action={
              <Button variant="outline" onClick={() => setLocalFilters({ ...filters, search: '', status: 'all', platform: 'all' })}>
                Clear All Filters
              </Button>
            }
          />
        ) : (
          proposals.map((proposal) => (
            <Card
              key={proposal.id}
              onClick={() => handleProposalClick(proposal.id)}
              className="group cursor-pointer transition-all duration-300 hover:shadow-lg hover:border-primary/30 border-slate-200 dark:border-slate-800 overflow-hidden relative"
            >
              {/* Highlight bar on the left */}
              <div className={cn(
                "absolute left-0 top-0 w-1 h-full transition-all group-hover:w-1.5",
                proposal.status === 'won' ? "bg-green-500" :
                proposal.status === 'lost' ? "bg-red-500" :
                proposal.status === 'draft' ? "bg-slate-400" : "bg-primary"
              )} />

              <CardContent className="p-5 md:p-6">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-bold text-lg group-hover:text-primary transition-colors line-clamp-1">
                        {proposal.title}
                      </h3>
                      <Badge
                        variant={
                          proposal.status === 'won' ? 'default' :
                          proposal.status === 'lost' ? 'destructive' :
                          proposal.status === 'draft' ? 'outline' :
                          'secondary'
                        }
                        className={cn(
                          "capitalize px-2 py-0.5 text-[10px] font-semibold flex items-center gap-1",
                          proposal.status === 'draft' && "text-yellow-700 border-yellow-300 bg-yellow-50 dark:text-yellow-300 dark:border-yellow-700 dark:bg-yellow-950",
                          proposal.status === 'submitted' && "bg-green-50 text-green-700 border-green-300 dark:bg-green-950 dark:text-green-300 dark:border-green-700",
                          proposal.status === 'won' && "bg-emerald-600 text-white",
                          proposal.status === 'lost' && "bg-red-600 text-white"
                        )}
                      >
                        {proposal.status === 'draft' && <Edit className="h-3 w-3" />}
                        {proposal.status === 'submitted' && <Check className="h-3 w-3" />}
                        {proposal.status === 'won' && <Award className="h-3 w-3" />}
                        {proposal.status === 'lost' && <X className="h-3 w-3" />}
                        {proposal.status}
                      </Badge>
                    </div>
                    {proposal.description && (
                      <p className="text-sm text-muted-foreground line-clamp-1 max-w-2xl">
                        {proposal.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:bg-destructive/10"
                      onClick={(e) => handleDelete(e, proposal.id)}
                      disabled={isDeleting === proposal.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t flex flex-wrap items-center gap-y-2 gap-x-6 text-xs font-medium text-slate-500 dark:text-slate-400">
                  {proposal.budget && (
                    <div className="flex items-center gap-1.5">
                      <DollarSign className="h-3.5 w-3.5 text-green-600" />
                      {proposal.budget}
                    </div>
                  )}
                  {proposal.job_platform && (
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="h-3.5 w-3.5 text-blue-600" />
                      <span className="capitalize">{proposal.job_platform}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5" />
                    {new Date(proposal.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  )
}
