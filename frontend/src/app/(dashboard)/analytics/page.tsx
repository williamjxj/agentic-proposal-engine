/**
 * Analytics Page
 * 
 * Displays workflow and performance analytics with state preservation.
 * Integrates with session context for seamless navigation.
 */

'use client'

import { useEffect, useState } from 'react'
import { useSessionState } from '@/hooks/useSessionState'
import { useNavigationTiming } from '@/hooks/useNavigationTiming'
import { LoadingSkeleton } from '@/components/workflow/progress-overlay'
import { PageHeader } from '@/components/shared/page-header'
import { PageContainer } from '@/components/shared/page-container'

interface AnalyticsFilters {
  timeRange: string
  metric: string
}

export default function AnalyticsPage() {
  const { getFilters, setFilters } = useSessionState()
  const { measureOperation, getPerformanceMetrics } = useNavigationTiming()
  const [isLoading, setIsLoading] = useState(true)
  const [analytics, setAnalytics] = useState<any>(null)
  const [perfMetrics, setPerfMetrics] = useState<any>(null)

  // Get saved filters from session state
  const savedFilters = getFilters<AnalyticsFilters>()
  const [filters, setLocalFilters] = useState<AnalyticsFilters>({
    timeRange: savedFilters.timeRange || '7d',
    metric: savedFilters.metric || 'overview',
  })

  // Load data
  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      
      try {
        await measureOperation('load-analytics', async () => {
          // Simulate API call
          await new Promise(resolve => setTimeout(resolve, 700))
          
          // TODO: Replace with actual API call
          setAnalytics({
            totalProposals: 42,
            acceptanceRate: 65,
            averageResponseTime: '2.3 days',
            revenue: '$125,000',
          })
        })
      } catch (error) {
        console.error('Error loading analytics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()

    // Get performance metrics from current session
    const metrics = getPerformanceMetrics()
    setPerfMetrics(metrics)
  }, [filters.timeRange])

  // Save filters when they change
  useEffect(() => {
    setFilters(filters)
  }, [filters, setFilters])

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          title="Analytics"
          description="Track your performance and workflow metrics"
        />
        <LoadingSkeleton lines={6} />
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <PageHeader
        title="Analytics"
        description="Track your performance and workflow metrics"
      />

      {/* Filters */}
      <div className="flex gap-4">
        <select
          value={filters.timeRange}
          onChange={(e) => setLocalFilters({ ...filters, timeRange: e.target.value })}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>

        <select
          value={filters.metric}
          onChange={(e) => setLocalFilters({ ...filters, metric: e.target.value })}
          className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="overview">Overview</option>
          <option value="proposals">Proposals</option>
          <option value="revenue">Revenue</option>
          <option value="performance">Performance</option>
        </select>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-slate-200 p-6 dark:border-slate-800">
          <p className="text-sm text-muted-foreground">Total Proposals</p>
          <p className="text-3xl font-bold mt-2">{analytics?.totalProposals}</p>
        </div>

        <div className="rounded-lg border border-slate-200 p-6 dark:border-slate-800">
          <p className="text-sm text-muted-foreground">Acceptance Rate</p>
          <p className="text-3xl font-bold mt-2">{analytics?.acceptanceRate}%</p>
        </div>

        <div className="rounded-lg border border-slate-200 p-6 dark:border-slate-800">
          <p className="text-sm text-muted-foreground">Avg Response Time</p>
          <p className="text-3xl font-bold mt-2">{analytics?.averageResponseTime}</p>
        </div>

        <div className="rounded-lg border border-slate-200 p-6 dark:border-slate-800">
          <p className="text-sm text-muted-foreground">Revenue</p>
          <p className="text-3xl font-bold mt-2">{analytics?.revenue}</p>
        </div>
      </div>

      {/* Workflow Performance Metrics */}
      {perfMetrics && (
        <div className="rounded-lg border border-slate-200 p-6 dark:border-slate-800">
          <h2 className="text-xl font-semibold mb-4">Workflow Performance (Current Session)</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Total Navigations</p>
              <p className="text-2xl font-bold mt-1">{perfMetrics.totalNavigations}</p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Average Duration</p>
              <p className="text-2xl font-bold mt-1">
                {Math.round(perfMetrics.averageDuration)}ms
              </p>
              {perfMetrics.averageDuration > 500 && (
                <p className="text-xs text-red-600 mt-1 dark:text-red-400">
                  Above 500ms target
                </p>
              )}
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Slow Navigations</p>
              <p className="text-2xl font-bold mt-1">{perfMetrics.slowNavigations}</p>
              {perfMetrics.slowNavigations > 0 && (
                <p className="text-xs text-amber-600 mt-1 dark:text-amber-400">
                  {Math.round((perfMetrics.slowNavigations / perfMetrics.totalNavigations) * 100)}% of total
                </p>
              )}
            </div>
          </div>

          {/* Recent Navigation Times */}
          {perfMetrics.entries.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-medium mb-2">Recent Navigation Times</h3>
              <div className="space-y-2">
                {perfMetrics.entries.slice(-5).map((entry: any, i: number) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground truncate flex-1">
                      {entry.name.replace('nav-duration-', '')}
                    </span>
                    <span className={entry.duration > 500 ? 'text-red-600 dark:text-red-400' : 'text-green-600 dark:text-green-400'}>
                      {Math.round(entry.duration)}ms
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Charts and Detailed Analytics - Coming Soon */}
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900/30 p-16 text-center">
        <div className="mx-auto max-w-md">
          <p className="text-5xl mb-4" aria-hidden>📊</p>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-2">
            Charts and Detailed Analytics Coming Soon
          </h3>
          <p className="text-sm text-muted-foreground">
            We&apos;re building interactive charts for proposal trends, acceptance rates over time, revenue metrics, and platform performance. Check back soon.
          </p>
        </div>
      </div>
    </PageContainer>
  )
}
