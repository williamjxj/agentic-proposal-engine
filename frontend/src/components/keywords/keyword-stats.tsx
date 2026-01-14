/**
 * Keyword Stats Component
 * 
 * Displays statistics for a keyword.
 */

'use client'

import { useKeywordStats } from '@/hooks/useKeywords'

interface KeywordStatsProps {
  keywordId: string
}

export function KeywordStats({ keywordId }: KeywordStatsProps) {
  const { data: stats, isLoading } = useKeywordStats(keywordId)

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading stats...</div>
  }

  if (!stats) {
    return null
  }

  return (
    <div className="rounded-lg border border-slate-200 p-4 dark:border-slate-800">
      <h3 className="text-sm font-medium mb-3">Statistics</h3>
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Jobs Matched:</span>
          <span className="font-medium">{stats.jobs_matched}</span>
        </div>
        {stats.last_match_at && (
          <div className="flex justify-between">
            <span className="text-muted-foreground">Last Match:</span>
            <span className="font-medium">
              {new Date(stats.last_match_at).toLocaleDateString()}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}
