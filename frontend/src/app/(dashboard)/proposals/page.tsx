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
import { LoadingSkeleton, CardListSkeleton } from '@/components/workflow/progress-overlay'
import { PageHeader } from '@/components/shared/page-header'
import { PageContainer } from '@/components/shared/page-container'
import { EmptyState } from '@/components/shared/empty-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

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
      <PageContainer>
        <PageHeader
          title="Proposals"
          description="Create and manage your project proposals"
        />
        <div className="space-y-6">
          <LoadingSkeleton lines={1} />
          <CardListSkeleton count={5} />
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer ref={scrollContainerRef} className="space-y-6">
      <PageHeader
        title="Proposals"
        description="Create and manage your project proposals"
      >
        <Button onClick={handleNewProposal}>New Proposal</Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          type="text"
          placeholder="Search proposals..."
          value={filters.search}
          onChange={(e) => setLocalFilters({ ...filters, search: e.target.value })}
          className="flex-1"
        />
        <select
          value={filters.status}
          onChange={(e) => setLocalFilters({ ...filters, status: e.target.value })}
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
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
          className="rounded-md border border-input bg-background px-3 py-2 text-sm"
        >
          <option value="created">Date Created</option>
          <option value="updated">Last Updated</option>
          <option value="title">Title</option>
        </select>
      </div>

      {/* Proposals List */}
      <div className="grid gap-4">
        {proposals.length === 0 ? (
          <EmptyState
            title="No proposals found"
            description="Create your first proposal to start winning freelance projects."
            icon={<span className="text-4xl">📝</span>}
            action={
              <Button onClick={handleNewProposal}>Create First Proposal</Button>
            }
          />
        ) : (
          proposals.map((proposal) => (
            <Card
              key={proposal.id}
              onClick={() => handleProposalClick(proposal.id)}
              className="cursor-pointer transition-all hover:shadow-md hover:border-primary/50"
            >
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="font-semibold text-lg">{proposal.title}</h3>
                  <Badge
                    variant={proposal.status === 'won' ? 'default' : proposal.status === 'lost' ? 'destructive' : 'secondary'}
                    className="capitalize shrink-0"
                  >
                    {proposal.status}
                  </Badge>
                </div>
                {proposal.description && (
                  <p className="mt-2 text-sm text-muted-foreground line-clamp-2">
                    {proposal.description}
                  </p>
                )}
                <div className="mt-3 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  {proposal.budget && <span>💰 {proposal.budget}</span>}
                  {proposal.timeline && <span>📅 {proposal.timeline}</span>}
                  {'job_title' in proposal && proposal.job_title && (
                    <span className="truncate max-w-[200px]" title={proposal.job_title}>
                      📎 {proposal.job_title}
                    </span>
                  )}
                  <span>Created {new Date(proposal.created_at).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </PageContainer>
  )
}
