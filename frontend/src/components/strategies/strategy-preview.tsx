/**
 * Strategy Preview Component
 * 
 * Displays test proposal preview for a strategy.
 */

'use client'

import type { TestProposal } from '@/types/strategies'

interface StrategyPreviewProps {
  proposal: TestProposal | null
  onClose: () => void
}

export function StrategyPreview({ proposal, onClose }: StrategyPreviewProps) {
  if (!proposal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Test Proposal Preview</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900">
          <div className="mb-2 text-xs font-medium text-muted-foreground uppercase">
            Generated Proposal
          </div>
          <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
            {proposal.proposal}
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
