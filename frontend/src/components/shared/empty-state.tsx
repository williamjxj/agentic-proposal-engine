/**
 * Empty State Component
 * 
 * Shared empty state component for consistent display across all pages.
 */

'use client'

import { ReactNode } from 'react'

interface EmptyStateProps {
  title?: string
  description?: string
  icon?: ReactNode
  action?: ReactNode
}

export function EmptyState({
  title = 'No items found',
  description = 'Get started by creating your first item.',
  icon,
  action,
}: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
      {icon && <div className="mb-4 flex justify-center">{icon}</div>}
      <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="text-sm text-muted-foreground mt-2">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
