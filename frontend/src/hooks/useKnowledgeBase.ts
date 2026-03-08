/**
 * useKnowledgeBase Hook
 *
 * React Query hooks for knowledge base document management.
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listDocuments,
  getDocument,
  uploadDocument,
  deleteDocument,
  reprocessDocument,
  getDocumentStats,
} from '@/lib/api/client'
import type {
  Document,
  DocumentFilters,
  DocumentStats,
} from '@/types/knowledge-base'

/**
 * Query key factory for documents
 */
export const documentKeys = {
  all: ['documents'] as const,
  lists: () => [...documentKeys.all, 'list'] as const,
  list: (filters?: DocumentFilters) => [...documentKeys.lists(), filters] as const,
  details: () => [...documentKeys.all, 'detail'] as const,
  detail: (id: string) => [...documentKeys.details(), id] as const,
  stats: (id: string) => [...documentKeys.detail(id), 'stats'] as const,
}

/**
 * Hook to list documents with optional filters
 */
export function useDocuments(filters?: DocumentFilters) {
  return useQuery({
    queryKey: documentKeys.list(filters),
    queryFn: () => listDocuments(filters),
    // Poll for processing documents
    refetchInterval: (query) => {
      const data = query.state.data as Document[] | undefined
      if (data?.some(doc => doc.processing_status === 'processing')) {
        return 2000 // Poll every 2 seconds if any document is processing
      }
      return false
    },
  })
}

/**
 * Hook to get a single document
 */
export function useDocument(documentId: string | null) {
  return useQuery({
    queryKey: documentKeys.detail(documentId || ''),
    queryFn: () => getDocument(documentId!),
    enabled: !!documentId,
    // Poll if document is processing
    refetchInterval: (query) => {
      const data = query.state.data as Document | undefined
      if (data?.processing_status === 'processing') {
        return 2000
      }
      return false
    },
  })
}

/**
 * Hook to get document statistics
 */
export function useDocumentStats(documentId: string | null) {
  return useQuery({
    queryKey: documentKeys.stats(documentId || ''),
    queryFn: () => getDocumentStats(documentId!),
    enabled: !!documentId,
  })
}

/**
 * Hook to upload a document
 */
export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      file,
      collection,
      options
    }: {
      file: File;
      collection: string;
      options?: {
        title?: string;
        supplemental_info?: string;
        reference_url?: string;
        email?: string;
        phone?: string;
        contact_url?: string;
      }
    }) =>
      uploadDocument(file, collection, options),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
    },
  })
}

/**
 * Hook to delete a document
 */
export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteDocument(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
    },
  })
}

/**
 * Hook to reprocess a document
 */
export function useReprocessDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => reprocessDocument(id),
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: documentKeys.lists() })
      queryClient.invalidateQueries({ queryKey: documentKeys.detail(id) })
    },
  })
}
