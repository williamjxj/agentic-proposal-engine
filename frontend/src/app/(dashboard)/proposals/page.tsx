/**
 * Proposals Page
 * 
 * Lists user proposals with filters and state preservation.
 * Integrates with session context for seamless navigation.
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useSessionState } from '@/hooks/useSessionState'
import { useNavigationTiming } from '@/hooks/useNavigationTiming'
import { LoadingSkeleton } from '@/components/workflow/progress-overlay'

interface ProposalFilters {
  search: string
  status: string
  sortBy: string
}

export default function ProposalsPage() {
  const router = useRouter()
  const { getFilters, setFilters, getScrollPosition, setScrollPosition, updateActiveEntity } = useSessionState()
  const { measureOperation } = useNavigationTiming()
  const [isLoading, setIsLoading] = useState(true)
  const [proposals, setProposals] = useState<any[]>([])
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Get saved filters from session state
  const savedFilters = getFilters<ProposalFilters>()
  const [filters, setLocalFilters] = useState<ProposalFilters>({
    search: savedFilters.search || '',
    status: savedFilters.status || 'all',
    sortBy: savedFilters.sortBy || 'created',
  })

  // Load data and restore scroll position
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      
      try {
        await measureOperation('load-proposals', async () => {
          const { listProposals } = await import('@/lib/api/client')
          
          // Fetch proposals from API
          const statusFilter = filters.status === 'all' ? undefined : filters.status
          const response = await listProposals(statusFilter, 50, 0)
          
          // Apply search filter if present
          let filteredProposals = response.proposals
          if (filters.search) {
            const searchLower = filters.search.toLowerCase()
            filteredProposals = filteredProposals.filter(p => 
              p.title.toLowerCase().includes(searchLower) ||
              (p.description && p.description.toLowerCase().includes(searchLower))
            )
          }
          
          // Apply sorting
          const sorted = [...filteredProposals].sort((a, b) => {
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

    loadData()

    // Restore scroll position after content loads
    const restoreScroll = async () => {
      if (scrollContainerRef.current) {
        const savedPosition = getScrollPosition('/proposals')
        if (savedPosition > 0) {
          scrollContainerRef.current.scrollTop = savedPosition
        }
      }
    }

    restoreScroll()
  }, [filters])

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

  // Update active entity when viewing a proposal
  const handleProposalClick = (proposalId: string) => {
    updateActiveEntity('proposal', proposalId)
    // TODO: Navigate to proposal detail/edit page
  }

  const handleNewProposal = () => {
    router.push('/proposals/new')
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Proposals</h1>
        <LoadingSkeleton lines={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6" ref={scrollContainerRef}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Proposals</h1>
          <p className="text-muted-foreground mt-2">
            Create and manage your project proposals
          </p>
        </div>
        <button 
          onClick={handleNewProposal}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          New Proposal
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search proposals..."
          value={filters.search}
          onChange={(e) => setLocalFilters({ ...filters, search: e.target.value })}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        
        <select
          value={filters.status}
          onChange={(e) => setLocalFilters({ ...filters, status: e.target.value })}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="submitted">Submitted</option>
          <option value="responded">Responded</option>
          <option value="won">Won</option>
          <option value="lost">Lost</option>
          <option value="archived">Archived</option>
        </select>

        <select
          value={filters.sortBy}
          onChange={(e) => setLocalFilters({ ...filters, sortBy: e.target.value })}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="created">Date Created</option>
          <option value="updated">Last Updated</option>
          <option value="title">Title</option>
        </select>
      </div>

      {/* Proposals List */}
      <div className="grid gap-4">
        {proposals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
            <p className="text-muted-foreground">No proposals found</p>
            <button 
              onClick={handleNewProposal}
              className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Create First Proposal
            </button>
          </div>
        ) : (
          proposals.map((proposal) => (
            <div
              key={proposal.id}
              onClick={() => handleProposalClick(proposal.id)}
              className="cursor-pointer rounded-lg border border-slate-200 p-4 hover:border-primary hover:shadow-md transition-all dark:border-slate-800 dark:hover:border-primary"
            >
              <h3 className="font-semibold">{proposal.title}</h3>
              {proposal.description && (
                <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                  {proposal.description}
                </p>
              )}
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span className="capitalize">{proposal.status}</span>
                {proposal.budget && <span>{proposal.budget}</span>}
                {proposal.timeline && <span>{proposal.timeline}</span>}
                <span>Created: {new Date(proposal.created_at).toLocaleDateString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
