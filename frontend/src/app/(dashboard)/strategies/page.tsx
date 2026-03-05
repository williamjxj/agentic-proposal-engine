/**
 * Strategies Page
 * 
 * Lists user strategies with filters and state preservation.
 * Integrates with session context for seamless navigation.
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { useSessionState } from '@/hooks/useSessionState'
import { useNavigationTiming } from '@/hooks/useNavigationTiming'
import { LoadingSkeleton } from '@/components/workflow/progress-overlay'
import {
  useStrategies,
  useDeleteStrategy,
  useSetDefaultStrategy,
  useTestStrategy,
} from '@/hooks/useStrategies'
import type { TestStrategyRequest, TestProposal } from '@/types/strategies'
import { StrategyList } from '@/components/strategies/strategy-list'
import { StrategyForm } from '@/components/strategies/strategy-form'
import { StrategyPreview } from '@/components/strategies/strategy-preview'
import { PageHeader } from '@/components/shared/page-header'
import { PageContainer } from '@/components/shared/page-container'
import { Button } from '@/components/ui/button'

export default function StrategiesPage() {
  const { getScrollPosition, setScrollPosition } = useSessionState()
  const { measureOperation } = useNavigationTiming()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingStrategy, setEditingStrategy] = useState<string | null>(null)
  const [testProposal, setTestProposal] = useState<TestProposal | null>(null)

  // Load strategies
  const { data: strategies = [], isLoading, error, refetch } = useStrategies()
  const deleteStrategyMutation = useDeleteStrategy()
  const setDefaultMutation = useSetDefaultStrategy()
  const testStrategyMutation = useTestStrategy()

  // Load data and restore scroll position
  useEffect(() => {
    async function loadData() {
      try {
        await measureOperation('load-strategies', async () => {
          await refetch()
        })
      } catch (error) {
        console.error('Error loading strategies:', error)
      }
    }

    loadData()

    // Restore scroll position after content loads
    const restoreScroll = async () => {
      if (scrollContainerRef.current) {
        const savedPosition = getScrollPosition('/strategies')
        if (savedPosition > 0) {
          scrollContainerRef.current.scrollTop = savedPosition
        }
      }
    }

    restoreScroll()
  }, [refetch, measureOperation, getScrollPosition])

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

  const handleDelete = async (strategyId: string) => {
    if (confirm('Are you sure you want to delete this strategy? This cannot be undone.')) {
      try {
        await deleteStrategyMutation.mutateAsync(strategyId)
      } catch (error) {
        console.error('Error deleting strategy:', error)
      }
    }
  }

  const handleEdit = (strategyId: string) => {
    setEditingStrategy(strategyId)
    setShowForm(true)
  }

  const handleCreate = () => {
    setEditingStrategy(null)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingStrategy(null)
  }

  const handleSetDefault = async (strategyId: string) => {
    try {
      await setDefaultMutation.mutateAsync(strategyId)
    } catch (error) {
      console.error('Error setting default strategy:', error)
    }
  }

  const handleTest = async (strategyId: string) => {
    try {
      const request: TestStrategyRequest = {}
      const proposal = await testStrategyMutation.mutateAsync({
        id: strategyId,
        request,
      })
      if (proposal) {
        setTestProposal(proposal)
      }
    } catch (error) {
      console.error('Error testing strategy:', error)
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          title="Strategies"
          description="Manage AI prompt templates for proposal generation"
        />
        <LoadingSkeleton lines={5} />
      </PageContainer>
    )
  }

  return (
    <PageContainer ref={scrollContainerRef} className="space-y-6">
      <PageHeader
        title="Strategies"
        description="Manage AI prompt templates for proposal generation"
      >
        <Button onClick={handleCreate}>Create Strategy</Button>
      </PageHeader>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <p>Error loading strategies: {error.message || 'Unknown error'}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-red-600 underline dark:text-red-400"
          >
            Retry
          </button>
        </div>
      )}

      {/* Strategies List */}
      <StrategyList
        strategies={strategies}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onSetDefault={handleSetDefault}
        onTest={handleTest}
      />

      {/* Form Modal */}
      {showForm && (
        <StrategyForm
          strategyId={editingStrategy}
          onClose={handleFormClose}
          onSuccess={() => {
            handleFormClose()
            refetch()
          }}
        />
      )}

      {/* Test Preview Modal */}
      {testProposal && (
        <StrategyPreview
          proposal={testProposal}
          onClose={() => setTestProposal(null)}
        />
      )}
    </PageContainer>
  )
}
