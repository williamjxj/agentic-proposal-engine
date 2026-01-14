/**
 * useKeywords Hook
 * 
 * React Query hooks for keyword management.
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listKeywords,
  getKeyword,
  createKeyword,
  updateKeyword,
  deleteKeyword,
  getKeywordStats,
} from '@/lib/api/client'
import type {
  Keyword,
  KeywordCreate,
  KeywordUpdate,
  KeywordFilters,
  KeywordStats,
} from '@/types/keywords'

/**
 * Query key factory for keywords
 */
export const keywordKeys = {
  all: ['keywords'] as const,
  lists: () => [...keywordKeys.all, 'list'] as const,
  list: (filters?: KeywordFilters) => [...keywordKeys.lists(), filters] as const,
  details: () => [...keywordKeys.all, 'detail'] as const,
  detail: (id: string) => [...keywordKeys.details(), id] as const,
  stats: (id: string) => [...keywordKeys.detail(id), 'stats'] as const,
}

/**
 * Hook to list keywords with optional filters
 */
export function useKeywords(filters?: KeywordFilters) {
  return useQuery({
    queryKey: keywordKeys.list(filters),
    queryFn: () => listKeywords(filters),
  })
}

/**
 * Hook to get a single keyword
 */
export function useKeyword(keywordId: string | null) {
  return useQuery({
    queryKey: keywordKeys.detail(keywordId || ''),
    queryFn: () => getKeyword(keywordId!),
    enabled: !!keywordId,
  })
}

/**
 * Hook to get keyword statistics
 */
export function useKeywordStats(keywordId: string | null) {
  return useQuery({
    queryKey: keywordKeys.stats(keywordId || ''),
    queryFn: () => getKeywordStats(keywordId!),
    enabled: !!keywordId,
  })
}

/**
 * Hook to create a keyword
 */
export function useCreateKeyword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: KeywordCreate) => createKeyword(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keywordKeys.lists() })
    },
  })
}

/**
 * Hook to update a keyword
 */
export function useUpdateKeyword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: KeywordUpdate }) =>
      updateKeyword(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: keywordKeys.lists() })
      queryClient.invalidateQueries({ queryKey: keywordKeys.detail(variables.id) })
    },
  })
}

/**
 * Hook to delete a keyword
 */
export function useDeleteKeyword() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteKeyword(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keywordKeys.lists() })
    },
  })
}
