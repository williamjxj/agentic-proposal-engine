/**
 * Conflict Dialog Component
 * 
 * Shows conflict resolution options when a draft save conflict is detected.
 * Allows user to choose between keeping server version, client version, or attempting merge.
 */

'use client'

import { AlertTriangle, Server, Laptop, GitMerge } from 'lucide-react'
import type { ConflictInfo, ConflictResolution } from '@/lib/workflow/conflict-handler'

export interface ConflictDialogProps {
  conflictInfo: ConflictInfo
  recommendedResolution: ConflictResolution
  onResolve: (resolution: ConflictResolution) => void
  onCancel: () => void
}

/**
 * Dialog for resolving draft conflicts
 */
export function ConflictDialog({
  conflictInfo,
  recommendedResolution,
  onResolve,
  onCancel,
}: ConflictDialogProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-slate-900">
        {/* Header */}
        <div className="flex items-start gap-3 mb-4">
          <AlertTriangle className="h-6 w-6 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-xl font-semibold">Draft Conflict Detected</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Your draft conflicts with a newer version. Choose how to resolve this conflict.
            </p>
          </div>
        </div>

        {/* Conflict Details */}
        <div className="rounded-lg border border-slate-200 p-4 mb-6 dark:border-slate-800">
          <p className="text-sm">{conflictInfo.message}</p>
          <div className="mt-3 flex items-center gap-4 text-xs text-muted-foreground">
            <span>Your version: {conflictInfo.clientVersion}</span>
            <span>•</span>
            <span>Server version: {conflictInfo.serverVersion}</span>
          </div>
        </div>

        {/* Resolution Options */}
        <div className="space-y-3 mb-6">
          {/* Keep Client (Your Changes) */}
          <button
            onClick={() => onResolve('keep_client')}
            className={`w-full text-left rounded-lg border p-4 transition-all hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-950 ${
              recommendedResolution === 'keep_client'
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <Laptop className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Keep Your Changes</h3>
                  {recommendedResolution === 'keep_client' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Overwrite the server version with your local changes. This is the &quot;last-write-wins&quot; approach.
                </p>
              </div>
            </div>
          </button>

          {/* Keep Server */}
          <button
            onClick={() => onResolve('keep_server')}
            className={`w-full text-left rounded-lg border p-4 transition-all hover:border-green-500 hover:bg-green-50 dark:hover:bg-green-950 ${
              recommendedResolution === 'keep_server'
                ? 'border-green-500 bg-green-50 dark:bg-green-950'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <Server className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Keep Server Version</h3>
                  {recommendedResolution === 'keep_server' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Discard your local changes and use the server&apos;s version. Your recent edits will be lost.
                </p>
              </div>
            </div>
          </button>

          {/* Attempt Merge */}
          <button
            onClick={() => onResolve('manual_merge')}
            className={`w-full text-left rounded-lg border p-4 transition-all hover:border-purple-500 hover:bg-purple-50 dark:hover:bg-purple-950 ${
              recommendedResolution === 'manual_merge'
                ? 'border-purple-500 bg-purple-50 dark:bg-purple-950'
                : 'border-slate-200 dark:border-slate-800'
            }`}
          >
            <div className="flex items-start gap-3">
              <GitMerge className="h-5 w-5 text-purple-600 dark:text-purple-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">Attempt Auto-Merge</h3>
                  {recommendedResolution === 'manual_merge' && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300">
                      Recommended
                    </span>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  Try to combine both versions by keeping non-conflicting changes from each. May not preserve all changes.
                </p>
              </div>
            </div>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-md text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
        </div>

        {/* Help Text */}
        <div className="mt-4 p-3 rounded-md bg-slate-50 dark:bg-slate-900/50">
          <p className="text-xs text-muted-foreground">
            💡 <strong>Tip:</strong> Conflicts usually occur when you edit the same draft in multiple browser tabs or when another user modifies the same draft. Consider using a single tab for editing to avoid conflicts.
          </p>
        </div>
      </div>
    </div>
  )
}
