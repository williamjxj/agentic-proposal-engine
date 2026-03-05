/**
 * Knowledge Base Page
 * 
 * Lists user documents with filters and state preservation.
 * Integrates with session context for seamless navigation.
 */

'use client'

import { useEffect, useState, useRef } from 'react'
import { useSessionState } from '@/hooks/useSessionState'
import { useNavigationTiming } from '@/hooks/useNavigationTiming'
import { LoadingSkeleton } from '@/components/workflow/progress-overlay'
import {
  useDocuments,
  useDeleteDocument,
  useReprocessDocument,
} from '@/hooks/useKnowledgeBase'
import type {
  DocumentFilters,
  DocumentCollection,
  ProcessingStatus,
} from '@/types/knowledge-base'
import { DocumentList } from '@/components/knowledge-base/document-list'
import { DocumentUpload } from '@/components/knowledge-base/document-upload'
import { PageHeader } from '@/components/shared/page-header'
import { PageContainer } from '@/components/shared/page-container'
import { Button } from '@/components/ui/button'

export default function KnowledgeBasePage() {
  const { getFilters, setFilters, getScrollPosition, setScrollPosition } = useSessionState()
  const { measureOperation } = useNavigationTiming()
  const scrollContainerRef = useRef<HTMLDivElement>(null)
  const [showUpload, setShowUpload] = useState(false)

  // Get saved filters from session state
  const savedFilters = getFilters<DocumentFilters>()
  const [filters, setLocalFilters] = useState<DocumentFilters>({
    collection: savedFilters.collection,
    processing_status: savedFilters.processing_status,
  })

  // Load documents with filters
  const { data: documents = [], isLoading, error, refetch } = useDocuments(filters)
  const deleteDocumentMutation = useDeleteDocument()
  const reprocessDocumentMutation = useReprocessDocument()

  // Load data and restore scroll position
  useEffect(() => {
    async function loadData() {
      try {
        await measureOperation('load-documents', async () => {
          await refetch()
        })
      } catch (error) {
        console.error('Error loading documents:', error)
      }
    }

    loadData()

    // Restore scroll position after content loads
    const restoreScroll = async () => {
      if (scrollContainerRef.current) {
        const savedPosition = getScrollPosition('/knowledge-base')
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

  const handleDelete = async (documentId: string) => {
    if (confirm('Are you sure you want to delete this document? This cannot be undone.')) {
      try {
        await deleteDocumentMutation.mutateAsync(documentId)
      } catch (error) {
        console.error('Error deleting document:', error)
      }
    }
  }

  const handleReprocess = async (documentId: string) => {
    if (confirm('Reprocess this document? This will re-chunk and re-embed the content.')) {
      try {
        await reprocessDocumentMutation.mutateAsync(documentId)
      } catch (error) {
        console.error('Error reprocessing document:', error)
      }
    }
  }

  const handleUploadSuccess = () => {
    setShowUpload(false)
    refetch()
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          title="Knowledge Base"
          description="Upload and manage documents for AI-powered proposal generation"
        />
        <LoadingSkeleton lines={5} />
      </PageContainer>
    )
  }

  return (
    <PageContainer ref={scrollContainerRef} className="space-y-6">
      <PageHeader
        title="Knowledge Base"
        description="Upload and manage documents for AI-powered proposal generation"
      >
        <Button onClick={() => setShowUpload(true)}>Upload Document</Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex-1">
          <label htmlFor="collection-filter" className="block text-sm font-medium mb-1">
            Collection
          </label>
          <select
            id="collection-filter"
            value={filters.collection || ''}
            onChange={(e) =>
              setLocalFilters({
                ...filters,
                collection: (e.target.value || undefined) as DocumentCollection | undefined,
              })
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">All Collections</option>
            <option value="case_studies">Case Studies</option>
            <option value="team_profiles">Team Profiles</option>
            <option value="portfolio">Portfolio</option>
            <option value="other">Other</option>
          </select>
        </div>
        <div className="flex-1">
          <label htmlFor="status-filter" className="block text-sm font-medium mb-1">
            Status
          </label>
          <select
            id="status-filter"
            value={filters.processing_status || ''}
            onChange={(e) =>
              setLocalFilters({
                ...filters,
                processing_status: (e.target.value || undefined) as ProcessingStatus | undefined,
              })
            }
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <p>Error loading documents: {error.message || 'Unknown error'}</p>
          <button
            onClick={() => refetch()}
            className="mt-2 text-red-600 underline dark:text-red-400"
          >
            Retry
          </button>
        </div>
      )}

      {/* Documents List */}
      <DocumentList
        documents={documents}
        onDelete={handleDelete}
        onReprocess={handleReprocess}
      />

      {/* Upload Modal */}
      {showUpload && (
        <DocumentUpload onSuccess={handleUploadSuccess} onClose={() => setShowUpload(false)} />
      )}
    </PageContainer>
  )
}
