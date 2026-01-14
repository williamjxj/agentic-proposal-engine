/**
 * useStrategies Hook
 * 
 * React Query hooks for strategy management.
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  listStrategies,
  getStrategy,
  createStrategy,
  updateStrategy,
  deleteStrategy,
  setDefaultStrategy,
  testStrategy,
} from '@/lib/api/client'
import type {
  Strategy,
  StrategyCreate,
  StrategyUpdate,
  TestStrategyRequest,
  TestProposal,
} from '@/types/strategies'

/**
 * Query key factory for strategies
 */
export const strategyKeys = {
  all: ['strategies'] as const,
  lists: () => [...strategyKeys.all, 'list'] as const,
  list: () => [...strategyKeys.lists()] as const,
  details: () => [...strategyKeys.all, 'detail'] as const,
  detail: (id: string) => [...strategyKeys.details(), id] as const,
}

/**
 * Hook to list all strategies
 */
export function useStrategies() {
  return useQuery({
    queryKey: strategyKeys.list(),
    queryFn: () => listStrategies(),
  })
}

/**
 * Hook to get a single strategy
 */
export function useStrategy(strategyId: string | null) {
  return useQuery({
    queryKey: strategyKeys.detail(strategyId || ''),
    queryFn: () => getStrategy(strategyId!),
    enabled: !!strategyId,
  })
}

/**
 * Hook to create a strategy
 */
export function useCreateStrategy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: StrategyCreate) => createStrategy(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: strategyKeys.lists() })
    },
  })
}

/**
 * Hook to update a strategy
 */
export function useUpdateStrategy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: StrategyUpdate }) =>
      updateStrategy(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: strategyKeys.lists() })
      queryClient.invalidateQueries({ queryKey: strategyKeys.detail(variables.id) })
    },
  })
}

/**
 * Hook to delete a strategy
 */
export function useDeleteStrategy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteStrategy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: strategyKeys.lists() })
    },
  })
}

/**
 * Hook to set default strategy
 */
export function useSetDefaultStrategy() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => setDefaultStrategy(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: strategyKeys.lists() })
    },
  })
}

/**
 * Hook to test a strategy
 */
export function useTestStrategy() {
  return useMutation({
    mutationFn: ({ id, request }: { id: string; request?: TestStrategyRequest }) =>
      testStrategy(id, request),
  })
}
