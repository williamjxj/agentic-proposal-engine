/**
 * Analytics Page
 *
 * Displays workflow and performance analytics with interactive charts.
 * Proposal trends, acceptance rates, revenue metrics, platform performance.
 */

'use client'

import { useEffect, useState } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from 'recharts'
import { useSessionState } from '@/hooks/useSessionState'
import { useNavigationTiming } from '@/hooks/useNavigationTiming'
import { LoadingSkeleton } from '@/components/workflow/progress-overlay'
import { PageHeader } from '@/components/shared/page-header'
import { PageContainer } from '@/components/shared/page-container'
import { getProposalAnalytics, type ProposalAnalytics } from '@/lib/api/client'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

interface AnalyticsFilters {
  timeRange: string
  metric: string
}

const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  muted: '#94a3b8',
  accent: '#8b5cf6',
}

function formatDateShort(dateStr: string) {
  try {
    const d = new Date(dateStr)
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  } catch {
    return dateStr
  }
}

function formatRevenue(val: number) {
  if (val >= 1_000_000) return `$${(val / 1_000_000).toFixed(1)}M`
  if (val >= 1_000) return `$${(val / 1_000).toFixed(1)}k`
  return `$${val.toFixed(0)}`
}

export default function AnalyticsPage() {
  const { getFilters, setFilters } = useSessionState()
  const { measureOperation, getPerformanceMetrics } = useNavigationTiming()
  const [isLoading, setIsLoading] = useState(true)
  const [analytics, setAnalytics] = useState<ProposalAnalytics | null>(null)
  const [summary, setSummary] = useState<{
    totalProposals: number
    acceptanceRate: number
    revenue: number
  } | null>(null)
  const [perfMetrics, setPerfMetrics] = useState<Record<string, unknown> | null>(null)
  const [chartError, setChartError] = useState<string | null>(null)

  const savedFilters = getFilters<AnalyticsFilters>()
  const [filters, setLocalFilters] = useState<AnalyticsFilters>({
    timeRange: savedFilters.timeRange || '7d',
    metric: savedFilters.metric || 'overview',
  })

  useEffect(() => {
    async function loadData() {
      setIsLoading(true)
      setChartError(null)
      try {
        await measureOperation('load-analytics', async () => {
          const [stats] = await Promise.all([
            getProposalAnalytics(filters.timeRange),
          ])
          setAnalytics(stats || null)
          if (stats) {
            const total = stats.proposal_trends.reduce((s, t) => s + t.count, 0)
            const accepted = stats.acceptance_over_time.reduce((s, a) => s + a.accepted, 0)
            const responded = stats.acceptance_over_time.reduce((s, a) => s + a.total, 0)
            const revenue = stats.revenue_over_time.reduce((s, r) => s + r.revenue, 0)
            setSummary({
              totalProposals: total,
              acceptanceRate: responded > 0 ? Math.round((100 * accepted) / responded) : 0,
              revenue,
            })
          } else {
            setSummary({ totalProposals: 0, acceptanceRate: 0, revenue: 0 })
          }
        })
      } catch (error) {
        console.error('Error loading analytics:', error)
        setChartError(error instanceof Error ? error.message : 'Failed to load analytics')
        setAnalytics({
          proposal_trends: [],
          acceptance_over_time: [],
          revenue_over_time: [],
          platform_performance: [],
        })
        setSummary({ totalProposals: 0, acceptanceRate: 0, revenue: 0 })
      } finally {
        setIsLoading(false)
      }
    }
    loadData()
    setPerfMetrics(getPerformanceMetrics())
  }, [filters.timeRange, measureOperation])

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
      <div className="flex flex-wrap gap-4">
        <select
          value={filters.timeRange}
          onChange={(e) =>
            setLocalFilters({ ...filters, timeRange: e.target.value })
          }
          className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="24h">Last 24 Hours</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
        <select
          value={filters.metric}
          onChange={(e) =>
            setLocalFilters({ ...filters, metric: e.target.value })
          }
          className="rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
        >
          <option value="overview">Overview</option>
          <option value="proposals">Proposals</option>
          <option value="revenue">Revenue</option>
          <option value="performance">Performance</option>
        </select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Total Proposals</p>
            <p className="text-3xl font-bold mt-2">
              {summary?.totalProposals ?? 0}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Acceptance Rate</p>
            <p className="text-3xl font-bold mt-2">
              {summary?.acceptanceRate ?? 0}%
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Revenue (Accepted)</p>
            <p className="text-3xl font-bold mt-2">
              {summary ? formatRevenue(summary.revenue) : '$0'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      {chartError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30 p-4 text-sm text-amber-800 dark:text-amber-200">
          {chartError}
        </div>
      )}

      {analytics && (
        <div className="space-y-6">
          {/* Proposal Trends */}
          {analytics.proposal_trends.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Proposal Trends</h3>
                <p className="text-sm text-muted-foreground">
                  Proposals created and submitted over time
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={analytics.proposal_trends.map((t) => ({
                      ...t,
                      name: formatDateShort(t.date),
                    }))}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      formatter={(val) => [val ?? 0, '']}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.date
                          ? formatDateShort(payload[0].payload.date)
                          : ''
                      }
                    />
                    <Legend />
                    <Bar
                      dataKey="count"
                      name="Created"
                      fill={CHART_COLORS.primary}
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="submitted"
                      name="Submitted"
                      fill={CHART_COLORS.success}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Acceptance Rate Over Time */}
          {analytics.acceptance_over_time.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Acceptance Rate Over Time</h3>
                <p className="text-sm text-muted-foreground">
                  Win rate by week (accepted / submitted)
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart
                    data={analytics.acceptance_over_time.map((a) => ({
                      ...a,
                      name: formatDateShort(a.date),
                    }))}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      formatter={(val) => [`${Number(val) ?? 0}%`, 'Rate']}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.date
                          ? formatDateShort(payload[0].payload.date)
                          : ''
                      }
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="rate"
                      name="Acceptance %"
                      stroke={CHART_COLORS.success}
                      strokeWidth={2}
                      dot={{ fill: CHART_COLORS.success }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Revenue Over Time */}
          {analytics.revenue_over_time.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Revenue Over Time</h3>
                <p className="text-sm text-muted-foreground">
                  Total proposal value by month (accepted only)
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={analytics.revenue_over_time.map((r) => ({
                      ...r,
                      name: formatDateShort(r.period),
                    }))}
                    margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis
                      tick={{ fontSize: 12 }}
                      tickFormatter={(v) => formatRevenue(v)}
                    />
                    <Tooltip
                      formatter={(val) => [formatRevenue(Number(val) ?? 0), 'Revenue']}
                      labelFormatter={(_, payload) =>
                        payload?.[0]?.payload?.period
                          ? formatDateShort(payload[0].payload.period)
                          : ''
                      }
                    />
                    <Bar
                      dataKey="revenue"
                      name="Revenue"
                      fill={CHART_COLORS.accent}
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Platform Performance */}
          {analytics.platform_performance.length > 0 && (
            <Card>
              <CardHeader>
                <h3 className="text-lg font-semibold">Platform Performance</h3>
                <p className="text-sm text-muted-foreground">
                  Proposals and acceptance by platform
                </p>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={analytics.platform_performance}
                    layout="vertical"
                    margin={{ top: 8, right: 8, left: 60, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                    <XAxis type="number" tick={{ fontSize: 12 }} />
                    <YAxis
                      type="category"
                      dataKey="platform"
                      tick={{ fontSize: 12 }}
                      width={56}
                    />
                    <Tooltip
                      formatter={(val, name) => [
                        name === 'rate' ? `${Number(val) ?? 0}%` : (Number(val) ?? 0),
                        name === 'rate' ? 'Acceptance' : String(name ?? ''),
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="count" name="Total" fill={CHART_COLORS.primary} radius={[0, 4, 4, 0]}>
                      {analytics.platform_performance.map((_, i) => (
                        <Cell
                          key={i}
                          fill={
                            i % 3 === 0
                              ? CHART_COLORS.primary
                              : i % 3 === 1
                                ? CHART_COLORS.muted
                                : CHART_COLORS.accent
                          }
                        />
                      ))}
                    </Bar>
                    <Bar dataKey="accepted" name="Accepted" fill={CHART_COLORS.success} radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Empty state when no chart data */}
          {analytics.proposal_trends.length === 0 &&
            analytics.acceptance_over_time.length === 0 &&
            analytics.revenue_over_time.length === 0 &&
            analytics.platform_performance.length === 0 && (
              <Card className="border-dashed">
                <CardContent className="py-12 text-center">
                  <p className="text-4xl mb-4" aria-hidden>
                    📊
                  </p>
                  <h3 className="text-lg font-semibold mb-2">
                    No proposal data yet
                  </h3>
                  <p className="text-sm text-muted-foreground max-w-md mx-auto">
                    Create and submit proposals from the Proposals page. Charts will populate as you build your pipeline.
                  </p>
                </CardContent>
              </Card>
            )}
        </div>
      )}

      {/* Workflow Performance Metrics */}
      {perfMetrics && (perfMetrics as { totalNavigations?: number }).totalNavigations !== undefined && (
        <Card className="mt-6">
          <CardHeader>
            <h2 className="text-xl font-semibold">
              Workflow Performance (Current Session)
            </h2>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Navigations</p>
                <p className="text-2xl font-bold mt-1">
                  {(perfMetrics as { totalNavigations?: number }).totalNavigations ?? 0}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Average Duration</p>
                <p className="text-2xl font-bold mt-1">
                  {Math.round(
                    (perfMetrics as { averageDuration?: number }).averageDuration ?? 0
                  )}
                  ms
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Slow Navigations</p>
                <p className="text-2xl font-bold mt-1">
                  {(perfMetrics as { slowNavigations?: number }).slowNavigations ?? 0}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  )
}
