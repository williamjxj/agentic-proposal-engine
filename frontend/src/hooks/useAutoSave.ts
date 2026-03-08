/**
 * useAutoSave Hook
 *
 * Implements automatic draft saving with debounced onChange (300ms)
 * and periodic checkpoint (10 seconds).
 */

'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { draftManager } from '@/lib/workflow/draft-manager'
import type { DraftWork } from '@/types/workflow'

export interface UseAutoSaveOptions {
  entityType: string
  entityId: string | null
  data: Record<string, any>
  enabled?: boolean
  onSaveSuccess?: (draft: DraftWork) => void
  onSaveError?: (error: any) => void
  debounceMs?: number
  checkpointIntervalMs?: number
}

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface UseAutoSaveReturn {
  status: SaveStatus
  lastSaved: Date | null
  error: string | null
  currentVersion: number
  saveNow: () => Promise<void>
  hasUnsavedChanges: boolean
}

/**
 * Auto-save hook with debouncing and periodic checkpoints
 */
export function useAutoSave(options: UseAutoSaveOptions): UseAutoSaveReturn {
  const {
    entityType,
    entityId,
    data,
    enabled = true,
    onSaveSuccess,
    onSaveError,
    debounceMs = 300,
    checkpointIntervalMs = 10000, // 10 seconds
  } = options

  const [status, setStatus] = useState<SaveStatus>('idle')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [currentVersion, setCurrentVersion] = useState<number>(1)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const debounceTimerRef = useRef<NodeJS.Timeout>()
  const checkpointTimerRef = useRef<NodeJS.Timeout>()
  const lastDataRef = useRef<string>(JSON.stringify(data))
  const isSavingRef = useRef(false)
  const savePromiseRef = useRef<Promise<void> | null>(null)
  const dataRef = useRef(data)
  const lastSaveFailureTimeRef = useRef<number>(0)
  const FAILURE_BACKOFF_MS = 15000 // Don't retry for 15s after a failure

  dataRef.current = data

  /**
   * Perform save operation
   */
  const performSave = useCallback(async () => {
    if (!enabled) return

    // Back off after a recent failure to avoid infinite retry loops
    const now = Date.now()
    if (now - lastSaveFailureTimeRef.current < FAILURE_BACKOFF_MS) {
      return
    }

    // Wait for any in-flight save to complete first
    if (isSavingRef.current && savePromiseRef.current) {
      await savePromiseRef.current
    }

    const currentData = dataRef.current
    const currentDataStr = JSON.stringify(currentData)
    if (currentDataStr === lastDataRef.current) {
      return
    }

    isSavingRef.current = true
    setStatus('saving')
    setError(null)

    const savePromise = (async () => {
      try {
        const result = await draftManager.saveDraft({
          entityType,
          entityId,
          draftData: currentData,
          version: currentVersion,
          enableCache: true,
        })

        if (result) {
          setCurrentVersion(result.draftVersion)
          setLastSaved(new Date())
          setStatus('saved')
          setHasUnsavedChanges(false)
          lastDataRef.current = currentDataStr

          if (onSaveSuccess) {
            onSaveSuccess(result)
          }

          // Reset to idle after 2 seconds
          setTimeout(() => {
            setStatus((prev) => (prev === 'saved' ? 'idle' : prev))
          }, 2000)
        }
      } catch (err: any) {
        console.error('Auto-save failed:', err)
        lastSaveFailureTimeRef.current = Date.now()

        const errorMessage = err.type === 'conflict'
          ? 'Version conflict - please refresh and try again'
          : 'Failed to save draft'

        setError(errorMessage)
        setStatus('error')

        if (onSaveError) {
          onSaveError(err)
        }

        // Keep error status for 5 seconds
        setTimeout(() => {
          setStatus((prev) => (prev === 'error' ? 'idle' : prev))
          setError(null)
        }, 5000)
      } finally {
        isSavingRef.current = false
        savePromiseRef.current = null
      }
    })()

    savePromiseRef.current = savePromise
    await savePromise
  }, [enabled, entityType, entityId, currentVersion, onSaveSuccess, onSaveError])

  /**
   * Manual save trigger
   */
  const saveNow = useCallback(async () => {
    // Clear any pending debounced save
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    await performSave()
  }, [performSave])

  /**
   * Debounced save on data change
   */
  useEffect(() => {
    if (!enabled) return

    const currentDataStr = JSON.stringify(data)

    // Skip scheduling when in failure backoff to avoid retry loops
    if (Date.now() - lastSaveFailureTimeRef.current < FAILURE_BACKOFF_MS) {
      return
    }

    // Check if data changed
    if (currentDataStr !== lastDataRef.current) {
      setHasUnsavedChanges(true)

      // Clear existing debounce timer
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }

      // Set new debounce timer
      debounceTimerRef.current = setTimeout(() => {
        performSave()
      }, debounceMs)
    }

    // Cleanup
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current)
      }
    }
  }, [data, enabled, debounceMs])
  // Note: performSave is intentionally NOT in dependencies to avoid circular updates

  /**
   * Periodic checkpoint save (every 10 seconds)
   */
  useEffect(() => {
    if (!enabled) return

    // Set up periodic checkpoint
    checkpointTimerRef.current = setInterval(() => {
      if (hasUnsavedChanges) {
        performSave()
      }
    }, checkpointIntervalMs)

    // Cleanup
    return () => {
      if (checkpointTimerRef.current) {
        clearInterval(checkpointTimerRef.current)
      }
    }
  }, [enabled, hasUnsavedChanges, checkpointIntervalMs])
  // Note: performSave is intentionally NOT in dependencies to avoid circular updates

  /**
   * Save before page unload
   */
  useEffect(() => {
    if (!enabled) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        // Attempt synchronous save (may not complete)
        performSave()

        // Show browser confirmation dialog
        e.preventDefault()
        e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [enabled, hasUnsavedChanges])
  // Note: performSave is intentionally NOT in dependencies to avoid circular updates

  return {
    status,
    lastSaved,
    error,
    currentVersion,
    saveNow,
    hasUnsavedChanges,
  }
}
