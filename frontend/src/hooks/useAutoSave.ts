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

  /**
   * Perform save operation
   */
  const performSave = useCallback(async () => {
    if (!enabled) return

    // Wait for any in-flight save to complete first
    if (isSavingRef.current && savePromiseRef.current) {
      await savePromiseRef.current
    }

    // Check if data actually changed
    const currentDataStr = JSON.stringify(data)
    if (currentDataStr === lastDataRef.current && status !== 'idle') {
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
        draftData: data,
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
  }, [enabled, data, entityType, entityId, currentVersion, onSaveSuccess, onSaveError, status])

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
  }, [data, enabled, debounceMs, performSave])

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
  }, [enabled, hasUnsavedChanges, checkpointIntervalMs, performSave])

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
  }, [enabled, hasUnsavedChanges, performSave])

  return {
    status,
    lastSaved,
    error,
    currentVersion,
    saveNow,
    hasUnsavedChanges,
  }
}
