/**
 * useProjects Hook
 *
 * React Query hooks for projects with caching and parallel fetches.
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listProjects,
  getProjectStats,
  getAvailableDatasets,
  discoverProjects,
  createManualProject,
} from '@/lib/api/client'
import type { ProjectFilters } from '@/lib/api/client'

export const projectKeys = {
  all: ['projects'] as const,
  lists: () => [...projectKeys.all, 'list'] as const,
  list: (filters?: ProjectFilters, limit?: number, offset?: number) => [...projectKeys.lists(), filters, limit, offset] as const,
  stats: () => [...projectKeys.all, 'stats'] as const,
  datasets: () => [...projectKeys.all, 'datasets'] as const,
}

/**
 * List projects with caching (staleTime 2min to reduce API calls)
 */
export function useProjects(
  filters?: ProjectFilters,
  limit = 50,
  offset = 0,
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: projectKeys.list(filters, limit, offset),
    queryFn: () => listProjects(filters, limit, offset),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    enabled: options?.enabled !== false,
  })
}

/**
 * Project stats - cache longer (changes less frequently)
 */
export function useProjectStats() {
  return useQuery({
    queryKey: projectKeys.stats(),
    queryFn: getProjectStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000,
  })
}

/**
 * Available datasets - cache longer (rarely changes)
 */
export function useProjectDatasets() {
  return useQuery({
    queryKey: projectKeys.datasets(),
    queryFn: getAvailableDatasets,
    staleTime: 10 * 60 * 1000, // 10 minutes
    gcTime: 30 * 60 * 1000,
  })
}

/**
 * Discover projects mutation (invalidates list cache on success)
 */
export function useDiscoverProjects() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (params: {
      keywords: string[]
      max_results?: number
      dataset_id?: string
    }) =>
      discoverProjects({
        keywords: params.keywords,
        max_results: params.max_results ?? 50,
        dataset_id: params.dataset_id,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
    },
  })
}

/**
 * Create manual project mutation
 */
export function useCreateManualProject() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (projectData: any) => createManualProject(projectData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: projectKeys.lists() })
      queryClient.invalidateQueries({ queryKey: projectKeys.stats() })
    },
  })
}
