/**
 * Strategy List Component
 * 
 * Displays a list of strategies with actions.
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
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
        <Card key={strategy.id} className="transition-all hover:shadow-md hover:border-primary/50">
          <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-lg">{strategy.name}</h3>
                {strategy.is_default && (
                  <Badge variant="default">Default</Badge>
                )}
                <Badge variant="secondary" className="capitalize">
                  {strategy.tone}
                </Badge>
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
                    <Badge key={idx} variant="outline">
                      {area}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {!strategy.is_default && (
                <Button variant="outline" size="sm" onClick={() => onSetDefault(strategy.id)}>
                  Set Default
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-green-600 border-green-300 dark:text-green-400" onClick={() => onTest(strategy.id)}>
                Test
              </Button>
              <Button variant="outline" size="sm" onClick={() => onEdit(strategy.id)}>
                Edit
              </Button>
              <Button variant="outline" size="sm" className="text-red-600 border-red-300 dark:text-red-400" onClick={() => onDelete(strategy.id)}>
                Delete
              </Button>
            </div>
          </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
