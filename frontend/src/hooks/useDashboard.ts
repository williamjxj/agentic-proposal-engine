/**
 * useDashboard Hook
 *
 * Custom hook for dashboard data aggregation from multiple sources
 */

'use client'

import { useQuery } from '@tanstack/react-query'
import { useProjectStats } from './useProjects'
import { listProposals, listKeywords, listDocuments, listStrategies } from '@/lib/api/client'

export interface DashboardStats {
  projects: {
    total: number
    newThisWeek: number
    avgBudget: number | null
    byPlatform: Record<string, number>
    filterKeywords: string | null
  }
  proposals: {
    total: number
    submitted: number
    draft: number
    thisMonth: number
  }
  knowledgeBase: {
    total: number
    byCollection: Record<string, number>
    recentlyAdded: number
  }
  keywords: {
    total: number
    active: number
  }
  strategies: {
    total: number
  }
  readiness: {
    hasKeywords: boolean
    hasDocuments: boolean
    hasStrategies: boolean
    hasProjects: boolean
    completionPercentage: number
  }
}

/**
 * Aggregate proposals data
 */
export function useProposalsStats() {
  return useQuery({
    queryKey: ['dashboard', 'proposals-stats'],
    queryFn: async () => {
      const { proposals } = await listProposals(undefined, 500, 0)

      const submitted = proposals.filter(p => p.status === 'submitted').length
      const draft = proposals.filter(p => p.status === 'draft').length

      // Count proposals from this month
      const now = new Date()
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      const thisMonth = proposals.filter(p => {
        const createdAt = new Date(p.created_at || p.createdAt)
        return createdAt >= startOfMonth
      }).length

      return {
        total: proposals.length,
        submitted,
        draft,
        thisMonth,
      }
    },
    staleTime: 60 * 1000, // 1 minute
  })
}

/**
 * Aggregate knowledge base stats
 */
export function useKnowledgeBaseStats() {
  return useQuery({
    queryKey: ['dashboard', 'kb-stats'],
    queryFn: async () => {
      const docs = await listDocuments()

      const byCollection: Record<string, number> = {}
      docs.forEach(doc => {
        const collection = doc.collection || 'other'
        byCollection[collection] = (byCollection[collection] || 0) + 1
      })

      // Count documents added in last 7 days
      const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const recentlyAdded = docs.filter(doc => {
        const uploadedAt = new Date(doc.uploaded_at || doc.created_at)
        return uploadedAt >= sevenDaysAgo
      }).length

      return {
        total: docs.length,
        byCollection,
        recentlyAdded,
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Aggregate keywords stats
 */
export function useKeywordsStats() {
  return useQuery({
    queryKey: ['dashboard', 'keywords-stats'],
    queryFn: async () => {
      const keywords = await listKeywords()
      const active = keywords.filter(k => k.is_active).length

      return {
        total: keywords.length,
        active,
      }
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  })
}

/**
 * Aggregate strategies stats
 */
export function useStrategiesStats() {
  return useQuery({
    queryKey: ['dashboard', 'strategies-stats'],
    queryFn: async () => {
      const strategies = await listStrategies()
      return {
        total: strategies.length,
      }
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Aggregate all dashboard stats
 */
export function useDashboardStats() {
  const projectStats = useProjectStats()
  const proposalsStats = useProposalsStats()
  const kbStats = useKnowledgeBaseStats()
  const keywordsStats = useKeywordsStats()
  const strategiesStats = useStrategiesStats()

  const isLoading =
    projectStats.isLoading ||
    proposalsStats.isLoading ||
    kbStats.isLoading ||
    keywordsStats.isLoading ||
    strategiesStats.isLoading

  const isError =
    projectStats.isError ||
    proposalsStats.isError ||
    kbStats.isError ||
    keywordsStats.isError ||
    strategiesStats.isError

  // Calculate readiness
  const hasKeywords = (keywordsStats.data?.total || 0) > 0
  const hasDocuments = (kbStats.data?.total || 0) > 0
  const hasStrategies = (strategiesStats.data?.total || 0) > 0
  const hasProjects = (projectStats.data?.total_opportunities || 0) > 0

  const completedSteps = [hasKeywords, hasDocuments, hasStrategies, hasProjects].filter(Boolean).length
  const completionPercentage = Math.round((completedSteps / 4) * 100)

  const data: DashboardStats | null = isLoading ? null : {
    projects: {
      total: projectStats.data?.total_opportunities || 0,
      newThisWeek: 0, // Not tracked yet
      avgBudget: projectStats.data?.avg_budget || null,
      byPlatform: projectStats.data?.by_platform || {},
      filterKeywords: projectStats.data?.filter_keywords || null,
    },
    proposals: proposalsStats.data || {
      total: 0,
      submitted: 0,
      draft: 0,
      thisMonth: 0,
    },
    knowledgeBase: kbStats.data || {
      total: 0,
      byCollection: {},
      recentlyAdded: 0,
    },
    keywords: keywordsStats.data || {
      total: 0,
      active: 0,
    },
    strategies: strategiesStats.data || {
      total: 0,
    },
    readiness: {
      hasKeywords,
      hasDocuments,
      hasStrategies,
      hasProjects,
      completionPercentage,
    },
  }

  return {
    data,
    isLoading,
    isError,
    refetch: () => {
      projectStats.refetch()
      proposalsStats.refetch()
      kbStats.refetch()
      keywordsStats.refetch()
      strategiesStats.refetch()
    },
  }
}
