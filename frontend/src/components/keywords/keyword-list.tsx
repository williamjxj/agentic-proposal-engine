/**
 * Keyword List Component
 *
 * Displays a list of keywords with actions.
 */

'use client'

import { Edit, Trash2 } from 'lucide-react'
import type { Keyword } from '@/types/keywords'

interface KeywordListProps {
  keywords: Keyword[]
  onEdit: (keywordId: string) => void
  onDelete: (keywordId: string) => void
}

export function KeywordList({ keywords, onEdit, onDelete }: KeywordListProps) {
  if (keywords.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
        <p className="text-muted-foreground">No keywords found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create your first keyword to start filtering job opportunities
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {keywords.map((keyword) => (
        <div
          key={keyword.id}
          className="rounded-lg border border-slate-200 p-4 hover:border-primary hover:shadow-md transition-all dark:border-slate-800 dark:hover:border-primary"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{keyword.keyword}</h3>
                {keyword.is_active ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800 dark:bg-gray-800 dark:text-gray-400">
                    Inactive
                  </span>
                )}
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 capitalize">
                  {keyword.match_type}
                </span>
              </div>
              {keyword.description && (
                <p className="text-sm text-muted-foreground mt-1">{keyword.description}</p>
              )}
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span>Jobs matched: {keyword.jobs_matched}</span>
                {keyword.last_match_at && (
                  <span>Last match: {new Date(keyword.last_match_at).toLocaleDateString()}</span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => onEdit(keyword.id)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 flex items-center gap-1.5"
                title="Edit keyword"
              >
                <Edit className="h-4 w-4" />
                Edit
              </button>
              <button
                onClick={() => onDelete(keyword.id)}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20 flex items-center gap-1.5"
                title="Delete keyword"
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
