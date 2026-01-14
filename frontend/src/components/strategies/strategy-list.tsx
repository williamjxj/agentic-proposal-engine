/**
 * Strategy List Component
 * 
 * Displays a list of strategies with actions.
 */

'use client'

import type { Strategy } from '@/types/strategies'

interface StrategyListProps {
  strategies: Strategy[]
  onEdit: (strategyId: string) => void
  onDelete: (strategyId: string) => void
  onSetDefault: (strategyId: string) => void
  onTest: (strategyId: string) => void
}

export function StrategyList({
  strategies,
  onEdit,
  onDelete,
  onSetDefault,
  onTest,
}: StrategyListProps) {
  if (strategies.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
        <p className="text-muted-foreground">No strategies found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Create your first strategy to customize how proposals are generated
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {strategies.map((strategy) => (
        <div
          key={strategy.id}
          className="rounded-lg border border-slate-200 p-4 hover:border-primary hover:shadow-md transition-all dark:border-slate-800 dark:hover:border-primary"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold">{strategy.name}</h3>
                {strategy.is_default && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    Default
                  </span>
                )}
                <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 capitalize">
                  {strategy.tone}
                </span>
              </div>
              {strategy.description && (
                <p className="text-sm text-muted-foreground mt-1">{strategy.description}</p>
              )}
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span>Used: {strategy.use_count} times</span>
                <span>Temperature: {strategy.temperature}</span>
                <span>Max Tokens: {strategy.max_tokens}</span>
              </div>
              {strategy.focus_areas && strategy.focus_areas.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {strategy.focus_areas.map((area, idx) => (
                    <span
                      key={idx}
                      className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 ml-4">
              {!strategy.is_default && (
                <button
                  onClick={() => onSetDefault(strategy.id)}
                  className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                >
                  Set Default
                </button>
              )}
              <button
                onClick={() => onTest(strategy.id)}
                className="rounded-md border border-green-300 px-3 py-1.5 text-sm font-medium text-green-600 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-900/20"
              >
                Test
              </button>
              <button
                onClick={() => onEdit(strategy.id)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(strategy.id)}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
