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
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Strategies</h1>
        <LoadingSkeleton lines={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6" ref={scrollContainerRef}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Strategies</h1>
          <p className="text-muted-foreground mt-2">
            Manage AI prompt templates for proposal generation
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Create Strategy
        </button>
      </div>

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
    </div>
  )
}
