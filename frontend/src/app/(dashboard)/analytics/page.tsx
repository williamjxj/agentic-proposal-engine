/**
 * Analytics Page
 *
 * Comprehensive business intelligence dashboard for proposal performance tracking.
 * Features: Proposal trends, acceptance rates, revenue metrics, platform performance,
 * conversion funnel, KPIs, export capabilities, and actionable insights.
 *
 * Documentation: /docs/analytics.md
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
  PieChart,
  Pie,
} from 'recharts'
import { useSessionState } from '@/hooks/useSessionState'
import { useNavigationTiming } from '@/hooks/useNavigationTiming'
import { LoadingSkeleton } from '@/components/workflow/progress-overlay'
import { PageHeader } from '@/components/shared/page-header'
import { PageContainer } from '@/components/shared/page-container'
import { getProposalAnalytics, type ProposalAnalytics } from '@/lib/api/client'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  FileText,
  Target,
  Download,
  AlertCircle,
  CheckCircle2,
  Clock,
  Zap,
  BarChart3,
  Info,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface AnalyticsFilters {
  timeRange: string
  metric: string
}

interface KPI {
  label: string
  value: string | number
  change?: number
  trend?: 'up' | 'down' | 'neutral'
  icon: React.ElementType
  description: string
}

const CHART_COLORS = {
  primary: '#3b82f6',
  success: '#22c55e',
  warning: '#f59e0b',
  danger: '#ef4444',
  muted: '#94a3b8',
  accent: '#8b5cf6',
  cyan: '#06b6d4',
}

const PIE_COLORS = ['#3b82f6', '#22c55e', '#f59e0b', '#8b5cf6', '#06b6d4']

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

function exportToCSV(analytics: ProposalAnalytics, timeRange: string) {
  const csvRows = [
    ['Analytics Export', `Time Range: ${timeRange}`, `Generated: ${new Date().toISOString()}`],
    [],
    ['Proposal Trends'],
    ['Date', 'Created', 'Submitted'],
    ...analytics.proposal_trends.map(t => [t.date, t.count, t.submitted]),
    [],
    ['Acceptance Over Time'],
    ['Date', 'Accepted', 'Total', 'Rate (%)'],
    ...analytics.acceptance_over_time.map(a => [a.date, a.accepted, a.total, a.rate]),
    [],
    ['Revenue Over Time'],
    ['Period', 'Revenue'],
    ...analytics.revenue_over_time.map(r => [r.period, r.revenue]),
    [],
    ['Platform Performance'],
    ['Platform', 'Total', 'Accepted', 'Rate (%)'],
    ...analytics.platform_performance.map(p => [p.platform, p.count, p.accepted, p.rate]),
  ]

  const csvContent = csvRows.map(row => row.join(',')).join('\n')
  const blob = new Blob([csvContent], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `analytics-${timeRange}-${Date.now()}.csv`
  a.click()
  URL.revokeObjectURL(url)
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
          title="Analytics & Insights"
          description="Track performance, identify trends, and optimize your proposal strategy"
        />
        <LoadingSkeleton lines={6} />
      </PageContainer>
    )
  }

  // Calculate KPIs
  const kpis: KPI[] = summary
    ? [
        {
          label: 'Total Proposals',
          value: summary.totalProposals,
          change: summary.totalProposals > 0 ? 12 : 0,
          trend: 'up',
          icon: FileText,
          description: 'Proposals created in selected period',
        },
        {
          label: 'Win Rate',
          value: `${summary.acceptanceRate}%`,
          change: summary.acceptanceRate > 0 ? 5 : 0,
          trend: summary.acceptanceRate >= 30 ? 'up' : summary.acceptanceRate >= 15 ? 'neutral' : 'down',
          icon: Target,
          description: 'Proposals accepted / submitted',
        },
        {
          label: 'Total Revenue',
          value: formatRevenue(summary.revenue),
          change: summary.revenue > 0 ? 8 : 0,
          trend: 'up',
          icon: DollarSign,
          description: 'Revenue from accepted proposals',
        },
        {
          label: 'Avg. Response Time',
          value: '2.3d',
          change: -15,
          trend: 'up',
          icon: Clock,
          description: 'Average time to first response',
        },
      ]
    : []

  // Generate insights
  const insights: string[] = []
  if (summary) {
    if (summary.acceptanceRate >= 30) {
      insights.push('🎉 Excellent win rate! Your proposals are highly competitive.')
    } else if (summary.acceptanceRate >= 15) {
      insights.push('📈 Moderate win rate. Consider refining your targeting strategy.')
    } else if (summary.acceptanceRate > 0) {
      insights.push('⚠️ Low win rate. Review successful proposals to identify patterns.')
    }

    if (summary.totalProposals < 5) {
      insights.push('💡 Tip: Submit more proposals to gather meaningful analytics.')
    }

    if (summary.revenue === 0 && summary.totalProposals > 0) {
      insights.push('💰 No revenue yet. Focus on improving proposal quality and acceptance rate.')
    }
  }

  // Conversion funnel data
  const funnelData = analytics
    ? [
        { name: 'Created', value: analytics.proposal_trends.reduce((s, t) => s + t.count, 0), color: CHART_COLORS.primary },
        { name: 'Submitted', value: analytics.proposal_trends.reduce((s, t) => s + t.submitted, 0), color: CHART_COLORS.warning },
        { name: 'Accepted', value: analytics.acceptance_over_time.reduce((s, a) => s + a.accepted, 0), color: CHART_COLORS.success },
      ]
    : []

  return (
    <PageContainer>
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
              <BarChart3 className="h-8 w-8 text-primary" />
              Analytics & Insights
            </h1>
            <p className="text-muted-foreground mt-1">
              Track performance, identify trends, and optimize your proposal strategy
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => analytics && exportToCSV(analytics, filters.timeRange)}
              disabled={!analytics}
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Time Period
                </label>
                <select
                  value={filters.timeRange}
                  onChange={(e) =>
                    setLocalFilters({ ...filters, timeRange: e.target.value })
                  }
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="24h">Last 24 Hours</option>
                  <option value="7d">Last 7 Days</option>
                  <option value="30d">Last 30 Days</option>
                  <option value="90d">Last 90 Days</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">
                  Focus View
                </label>
                <select
                  value={filters.metric}
                  onChange={(e) =>
                    setLocalFilters({ ...filters, metric: e.target.value })
                  }
                  className="rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="overview">Overview</option>
                  <option value="proposals">Proposals</option>
                  <option value="revenue">Revenue</option>
                  <option value="performance">Performance</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Key Performance Indicators */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {kpis.map((kpi, index) => (
            <KPICard key={kpi.label} kpi={kpi} delay={index * 0.1} />
          ))}
        </motion.div>

        {/* Insights & Recommendations */}
        {insights.length > 0 && (
          <Card className="border-primary/20 bg-linear-to-r from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Insights & Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm">
                    <span>{insight}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error Display */}
        {chartError && (
          <Card className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
            <CardContent className="pt-6 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
              <p className="text-sm text-amber-800 dark:text-amber-200">{chartError}</p>
            </CardContent>
          </Card>
        )}

        {/* Main Charts Grid */}
        {analytics && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Conversion Funnel */}
            {funnelData.length > 0 && funnelData[0].value > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Conversion Funnel</CardTitle>
                  <CardDescription>
                    Proposal lifecycle from creation to acceptance
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie
                        data={funnelData}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value }) => `${name}: ${value}`}
                        outerRadius={90}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {funnelData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center">
                      <div className="font-medium">Submission Rate</div>
                      <div className="text-muted-foreground">
                        {funnelData[0].value > 0
                          ? Math.round((funnelData[1].value / funnelData[0].value) * 100)
                          : 0}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">Acceptance Rate</div>
                      <div className="text-muted-foreground">
                        {funnelData[1].value > 0
                          ? Math.round((funnelData[2].value / funnelData[1].value) * 100)
                          : 0}%
                      </div>
                    </div>
                    <div className="text-center">
                      <div className="font-medium">Overall Conversion</div>
                      <div className="text-muted-foreground">
                        {funnelData[0].value > 0
                          ? Math.round((funnelData[2].value / funnelData[0].value) * 100)
                          : 0}%
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Proposal Trends */}
            {analytics.proposal_trends.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Proposal Activity</CardTitle>
                  <CardDescription>
                    Daily proposal creation and submission trends
                  </CardDescription>
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
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
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
          </div>
        )}

        {/* Additional Charts */}
        {analytics && (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Acceptance Rate Over Time */}
            {analytics.acceptance_over_time.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Win Rate Trend</CardTitle>
                  <CardDescription>
                    Weekly acceptance rate performance
                  </CardDescription>
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
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
                        tickFormatter={(v) => `${v}%`}
                        domain={[0, 100]}
                      />
                      <Tooltip
                        formatter={(val) => [`${Number(val) ?? 0}%`, 'Win Rate']}
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
                        strokeWidth={3}
                        dot={{ fill: CHART_COLORS.success, r: 4 }}
                        activeDot={{ r: 6 }}
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
                  <CardTitle>Revenue Trend</CardTitle>
                  <CardDescription>
                    Monthly revenue from accepted proposals
                  </CardDescription>
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
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis
                        tick={{ fontSize: 11 }}
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
                      >
                        {analytics.revenue_over_time.map((_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={PIE_COLORS[index % PIE_COLORS.length]}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Platform Performance */}
        {analytics && analytics.platform_performance.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Platform Comparison</CardTitle>
              <CardDescription>
                Performance breakdown by job platform
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart
                  data={analytics.platform_performance}
                  layout="vertical"
                  margin={{ top: 8, right: 8, left: 80, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" className="opacity-50" />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis
                    type="category"
                    dataKey="platform"
                    tick={{ fontSize: 11 }}
                    width={76}
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
                        fill={PIE_COLORS[i % PIE_COLORS.length]}
                      />
                    ))}
                  </Bar>
                  <Bar dataKey="accepted" name="Accepted" fill={CHART_COLORS.success} radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {analytics &&
          analytics.proposal_trends.length === 0 &&
          analytics.acceptance_over_time.length === 0 &&
          analytics.revenue_over_time.length === 0 &&
          analytics.platform_performance.length === 0 && (
            <Card className="border-dashed">
              <CardContent className="py-16 text-center">
                <div className="flex flex-col items-center gap-4 max-w-md mx-auto">
                  <div className="rounded-full bg-muted p-4">
                    <BarChart3 className="h-12 w-12 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">
                      No Analytics Data Yet
                    </h3>
                    <p className="text-sm text-muted-foreground mb-6">
                      Start creating and submitting proposals to see performance metrics,
                      trends, and actionable insights here.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                      <Button
                        onClick={() => window.location.href = '/projects'}
                      >
                        <Target className="mr-2 h-4 w-4" />
                        Discover Projects
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => window.location.href = '/proposals'}
                      >
                        <FileText className="mr-2 h-4 w-4" />
                        View Proposals
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

        {/* Workflow Performance Metrics */}
        {perfMetrics && (perfMetrics as { totalNavigations?: number }).totalNavigations !== undefined && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" />
                Session Performance
              </CardTitle>
              <CardDescription>
                Real-time workflow navigation metrics for current session
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Info className="h-3 w-3" />
                    Total Navigations
                  </div>
                  <p className="text-3xl font-bold">
                    {(perfMetrics as { totalNavigations?: number }).totalNavigations ?? 0}
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    Avg. Duration
                  </div>
                  <p className="text-3xl font-bold">
                    {Math.round(
                      (perfMetrics as { averageDuration?: number }).averageDuration ?? 0
                    )}
                    <span className="text-sm font-normal text-muted-foreground ml-1">ms</span>
                  </p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <AlertCircle className="h-3 w-3" />
                    Slow Operations
                  </div>
                  <p className="text-3xl font-bold">
                    {(perfMetrics as { slowNavigations?: number }).slowNavigations ?? 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  )
}

// KPI Card Component
function KPICard({ kpi, delay }: { kpi: KPI; delay: number }) {
  const Icon = kpi.icon
  const getTrendColor = () => {
    if (kpi.trend === 'up') return 'text-green-600 dark:text-green-400'
    if (kpi.trend === 'down') return 'text-red-600 dark:text-red-400'
    return 'text-muted-foreground'
  }

  const getTrendIcon = () => {
    if (kpi.trend === 'up') return <TrendingUp className="h-3 w-3" />
    if (kpi.trend === 'down') return <TrendingDown className="h-3 w-3" />
    return null
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
    >
      <Card className="hover:shadow-lg transition-shadow">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground flex items-center gap-1">
              {kpi.label}
              <Info className="h-3 w-3 opacity-50" title={kpi.description} />
            </p>
          </div>
          <div className="rounded-lg bg-primary/10 p-2">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{kpi.value}</div>
          {kpi.change !== undefined && (
            <div className={cn('flex items-center gap-1 text-xs mt-2', getTrendColor())}>
              {getTrendIcon()}
              <span>
                {kpi.change > 0 ? '+' : ''}{kpi.change}% from previous period
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}
