/**
 * Progress Overlay Component
 * 
 * Displays loading states during navigation and long-running operations.
 * Provides visual feedback to meet FR-002 (progress visibility).
 */

'use client'

import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'

interface ProgressOverlayProps {
  /** Whether the overlay is visible */
  isLoading: boolean
  /** Message to display */
  message?: string
  /** Show progress indicator (animated spinner) */
  showSpinner?: boolean
  /** Estimated completion time in milliseconds (optional) */
  estimatedTime?: number
  /** Callback when operation completes */
  onComplete?: () => void
}

/**
 * Progress overlay for navigation and operation feedback
 */
export function ProgressOverlay({
  isLoading,
  message = 'Loading...',
  showSpinner = true,
  estimatedTime,
  onComplete,
}: ProgressOverlayProps) {
  const [progress, setProgress] = useState(0)
  const [elapsedTime, setElapsedTime] = useState(0)

  // Track elapsed time
  useEffect(() => {
    if (!isLoading) {
      setElapsedTime(0)
      setProgress(0)
      return
    }

    const startTime = Date.now()
    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      setElapsedTime(elapsed)

      // Calculate progress if estimated time is provided
      if (estimatedTime) {
        const calculatedProgress = Math.min((elapsed / estimatedTime) * 100, 95)
        setProgress(calculatedProgress)
      }
    }, 100)

    return () => clearInterval(interval)
  }, [isLoading, estimatedTime])

  // Call onComplete when loading finishes
  useEffect(() => {
    if (!isLoading && onComplete) {
      onComplete()
    }
  }, [isLoading, onComplete])

  if (!isLoading) {
    return null
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="flex flex-col items-center gap-4 rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
        {showSpinner && (
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 dark:text-blue-400" />
        )}
        
        {message && (
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {message}
          </p>
        )}

        {estimatedTime && progress > 0 && (
          <div className="w-48">
            <div className="mb-1 flex justify-between text-xs text-slate-600 dark:text-slate-400">
              <span>{Math.round(progress)}%</span>
              {estimatedTime && (
                <span>
                  ~{Math.ceil((estimatedTime - elapsedTime) / 1000)}s remaining
                </span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full bg-blue-600 transition-all duration-300 ease-out dark:bg-blue-400"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Show elapsed time if operation is taking longer than expected */}
        {elapsedTime > 2000 && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {(elapsedTime / 1000).toFixed(1)}s elapsed
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Minimal inline loading indicator for smaller contexts
 */
export function InlineLoadingIndicator({ message }: { message?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <Loader2 className="h-4 w-4 animate-spin" />
      {message && <span>{message}</span>}
    </div>
  )
}

/**
 * Loading skeleton for content areas
 */
export function LoadingSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-3 animate-pulse">
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          className="h-4 bg-slate-200 rounded dark:bg-slate-700"
          style={{ width: `${100 - (i * 10)}%` }}
        />
      ))}
    </div>
  )
}

/**
 * Card-style skeleton for projects/proposals lists
 */
export function CardListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="rounded-lg border border-slate-200 p-6 dark:border-slate-800"
        >
          <div className="animate-pulse space-y-3">
            <div className="h-5 w-3/4 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-full rounded bg-slate-200 dark:bg-slate-700" />
            <div className="h-4 w-5/6 rounded bg-slate-200 dark:bg-slate-700" />
            <div className="flex gap-2 pt-2">
              <div className="h-6 w-16 rounded-full bg-slate-200 dark:bg-slate-700" />
              <div className="h-6 w-20 rounded-full bg-slate-200 dark:bg-slate-700" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
