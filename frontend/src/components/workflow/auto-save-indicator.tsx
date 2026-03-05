/**
 * Auto-Save Indicator Component
 * 
 * Shows visual feedback for auto-save status: Saving / Saved / Failed
 * Displays last saved time and provides manual save option.
 */

'use client'

import { useEffect, useState } from 'react'
import { Cloud, CloudOff, Loader2, Check, AlertCircle } from 'lucide-react'
import type { SaveStatus } from '@/hooks/useAutoSave'

export interface AutoSaveIndicatorProps {
  status: SaveStatus
  lastSaved: Date | null
  error: string | null
  hasUnsavedChanges?: boolean
  onManualSave?: () => void
  compact?: boolean
}

/**
 * Indicator component for auto-save status
 */
export function AutoSaveIndicator({
  status,
  lastSaved,
  error,
  hasUnsavedChanges = false,
  onManualSave,
  compact = false,
}: AutoSaveIndicatorProps) {
  const [relativeTime, setRelativeTime] = useState('')

  // Update relative time every 10 seconds
  useEffect(() => {
    const updateRelativeTime = () => {
      if (!lastSaved) {
        setRelativeTime('')
        return
      }

      const now = Date.now()
      const diff = now - lastSaved.getTime()
      const seconds = Math.floor(diff / 1000)
      const minutes = Math.floor(seconds / 60)
      const hours = Math.floor(minutes / 60)

      if (seconds < 10) {
        setRelativeTime('Just now')
      } else if (seconds < 60) {
        setRelativeTime(`${seconds}s ago`)
      } else if (minutes < 60) {
        setRelativeTime(`${minutes}m ago`)
      } else {
        setRelativeTime(`${hours}h ago`)
      }
    }

    updateRelativeTime()
    const interval = setInterval(updateRelativeTime, 10000)

    return () => clearInterval(interval)
  }, [lastSaved])

  // Compact version for tight spaces
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm" title="Draft auto-save status">
        {status === 'saving' && (
          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>Saving draft</span>
          </div>
        )}
        {status === 'saved' && (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <Check className="h-3 w-3" />
            <span>Saved</span>
          </div>
        )}
        {status === 'error' && (
          <div className="flex items-center gap-1 text-red-600 dark:text-red-400">
            <AlertCircle className="h-3 w-3" />
            <span>Error</span>
          </div>
        )}
        {status === 'idle' && hasUnsavedChanges && (
          <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <CloudOff className="h-3 w-3" />
            <span>Unsaved</span>
          </div>
        )}
      </div>
    )
  }

  // Full version with details
  return (
    <div className="flex items-center gap-3">
      {/* Status Icon and Text - Draft auto-save indicator */}
      <div className="flex items-center gap-2" title="Your draft is automatically saved as you type">
        {status === 'saving' && (
          <>
            <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
            <span className="text-sm text-blue-600 dark:text-blue-400">Saving draft...</span>
          </>
        )}
        
        {status === 'saved' && (
          <>
            <Cloud className="h-4 w-4 text-green-600 dark:text-green-400" />
            <span className="text-sm text-green-600 dark:text-green-400">
              Draft saved {relativeTime && `• ${relativeTime}`}
            </span>
          </>
        )}
        
        {status === 'error' && (
          <>
            <AlertCircle className="h-4 w-4 text-red-600 dark:text-red-400" />
            <span className="text-sm text-red-600 dark:text-red-400">
              {error || 'Save failed'}
            </span>
          </>
        )}
        
        {status === 'idle' && (
          <>
            {hasUnsavedChanges ? (
              <>
                <CloudOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                <span className="text-sm text-amber-600 dark:text-amber-400">
                  Unsaved changes
                </span>
              </>
            ) : lastSaved ? (
              <>
                <Check className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                <span className="text-sm text-slate-500 dark:text-slate-400">
                  Draft saved {relativeTime}
                </span>
              </>
            ) : null}
          </>
        )}
      </div>

      {/* Manual Save Button */}
      {onManualSave && status !== 'saving' && (
        <button
          onClick={onManualSave}
          className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 underline"
        >
          Save now
        </button>
      )}
    </div>
  )
}

/**
 * Draft recovery banner component
 */
export function DraftRecoveryBanner({
  onRecover,
  onDiscard,
  onDismiss,
}: {
  onRecover: () => void
  onDiscard: () => void
  onDismiss: () => void
}) {
  return (
    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950">
      <div className="flex items-start gap-3">
        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
        
        <div className="flex-1">
          <h3 className="font-medium text-amber-900 dark:text-amber-100">
            Draft Found
          </h3>
          <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
            We found an auto-saved draft from your previous session. Would you like to recover it?
          </p>
          
          <div className="flex gap-2 mt-3">
            <button
              onClick={onRecover}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-amber-600 text-white hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600"
            >
              Recover Draft
            </button>
            <button
              onClick={onDiscard}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-amber-300 text-amber-900 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-100 dark:hover:bg-amber-900"
            >
              Start Fresh
            </button>
            <button
              onClick={onDismiss}
              className="px-3 py-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
