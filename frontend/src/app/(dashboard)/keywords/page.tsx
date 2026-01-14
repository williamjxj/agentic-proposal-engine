/**
 * Keywords Page
 * 
 * Lists user keywords with filters and state preservation.
 * Integrates with session context for seamless navigation.
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { useSessionState } from '@/hooks/useSessionState'
import { useNavigationTiming } from '@/hooks/useNavigationTiming'
import { LoadingSkeleton } from '@/components/workflow/progress-overlay'
import { useKeywords, useDeleteKeyword } from '@/hooks/useKeywords'
import type { KeywordFilters } from '@/types/keywords'
import { KeywordList } from '@/components/keywords/keyword-list'
import { KeywordForm } from '@/components/keywords/keyword-form'

export default function KeywordsPage() {
  const { getFilters, setFilters, getScrollPosition, setScrollPosition } = useSessionState()
  const { measureOperation } = useNavigationTiming()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingKeyword, setEditingKeyword] = useState<string | null>(null)

  // Get saved filters from session state
  const savedFilters = getFilters<KeywordFilters>()
  const [filters, setLocalFilters] = useState<KeywordFilters>({
    search: savedFilters.search || '',
    is_active: savedFilters.is_active,
    match_type: savedFilters.match_type,
  })

  // Load keywords with filters
  const { data: keywords = [], isLoading, error, refetch } = useKeywords(filters)
  const deleteKeywordMutation = useDeleteKeyword()

  // Load data and restore scroll position
  useEffect(() => {
    async function loadData() {
      try {
        await measureOperation('load-keywords', async () => {
          await refetch()
        })
      } catch (error) {
        console.error('Error loading keywords:', error)
      }
    }

    loadData()

    // Restore scroll position after content loads
    const restoreScroll = async () => {
      if (scrollContainerRef.current) {
        const savedPosition = getScrollPosition('/keywords')
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

  // Save filters when they change
  useEffect(() => {
    setFilters(filters)
  }, [filters, setFilters])

  const handleDelete = async (keywordId: string) => {
    if (confirm('Are you sure you want to delete this keyword?')) {
      try {
        await deleteKeywordMutation.mutateAsync(keywordId)
      } catch (error) {
        console.error('Error deleting keyword:', error)
      }
    }
  }

  const handleEdit = (keywordId: string) => {
    setEditingKeyword(keywordId)
    setShowForm(true)
  }

  const handleCreate = () => {
    setEditingKeyword(null)
    setShowForm(true)
  }

  const handleFormClose = () => {
    setShowForm(false)
    setEditingKeyword(null)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">Keywords</h1>
        <LoadingSkeleton lines={5} />
      </div>
    )
  }

  return (
    <div className="space-y-6" ref={scrollContainerRef}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Keywords</h1>
          <p className="text-muted-foreground mt-2">
            Manage search keywords for job discovery
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Add Keyword
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <input
          type="text"
          placeholder="Search keywords..."
          value={filters.search || ''}
          onChange={(e) => setLocalFilters({ ...filters, search: e.target.value })}
          className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        />
        
        <select
          value={filters.is_active === undefined ? 'all' : filters.is_active ? 'active' : 'inactive'}
          onChange={(e) => {
            const value = e.target.value
            setLocalFilters({
              ...filters,
              is_active: value === 'all' ? undefined : value === 'active',
            })
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>

        <select
          value={filters.match_type || 'all'}
          onChange={(e) => {
            const value = e.target.value
            setLocalFilters({
              ...filters,
              match_type: value === 'all' ? undefined : value as any,
            })
          }}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="all">All Match Types</option>
          <option value="exact">Exact</option>
          <option value="partial">Partial</option>
          <option value="fuzzy">Fuzzy</option>
        </select>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <p>Error loading keywords: {error.message || 'Unknown error'}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-red-600 underline dark:text-red-400"
          >
            Retry
          </button>
        </div>
      )}

      {/* Keywords List */}
      <KeywordList
        keywords={keywords}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      {/* Form Modal */}
      {showForm && (
        <KeywordForm
          keywordId={editingKeyword}
          onClose={handleFormClose}
          onSuccess={() => {
            handleFormClose()
            refetch()
          }}
        />
      )}
    </div>
  )
}
