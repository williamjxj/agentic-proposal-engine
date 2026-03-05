/**
 * useDraftRecovery Hook
 * 
 * Checks for and offers recovery of drafts on page load.
 * Shows recovery banner if draft is found.
 */

'use client'

import { useEffect, useState, useCallback } from 'react'
import { draftManager } from '@/lib/workflow/draft-manager'
import type { DraftWork } from '@/types/workflow'

export interface UseDraftRecoveryOptions {
  entityType: string
  entityId: string | null
  onRecover?: (draft: DraftWork) => void
  onDiscard?: () => void
  autoCheck?: boolean
}

export interface UseDraftRecoveryReturn {
  hasDraft: boolean
  draft: DraftWork | null
  isChecking: boolean
  recoverDraft: () => void
  discardDraft: () => Promise<void>
  dismissPrompt: () => void
  showRecoveryPrompt: boolean
}

/**
 * Draft recovery hook for restoring unsaved work
 */
export function useDraftRecovery(options: UseDraftRecoveryOptions): UseDraftRecoveryReturn {
  const {
    entityType,
    entityId,
    onRecover,
    onDiscard,
    autoCheck = true,
  } = options

  const [draft, setDraft] = useState<DraftWork | null>(null)
  const [isChecking, setIsChecking] = useState(false)
  const [showRecoveryPrompt, setShowRecoveryPrompt] = useState(false)

  /**
   * Check for existing draft
   */
  const checkForDraft = useCallback(async () => {
    if (!autoCheck) return

    setIsChecking(true)

    try {
      const existingDraft = await draftManager.getDraft({
        entityType,
        entityId,
        useCache: true,
      })

      if (existingDraft && existingDraft.draftData) {
        setDraft(existingDraft)
        setShowRecoveryPrompt(true)
      }
    } catch (error) {
      console.error('Error checking for draft:', error)
    } finally {
      setIsChecking(false)
    }
  }, [entityType, entityId, autoCheck])

  /**
   * Recover draft data
   */
  const recoverDraft = useCallback(() => {
    if (draft && onRecover) {
      onRecover(draft)
    }
    setShowRecoveryPrompt(false)
  }, [draft, onRecover])

  /**
   * Discard draft
   */
  const discardDraft = useCallback(async () => {
    try {
      await draftManager.deleteDraft(entityType, entityId)
      setDraft(null)
      setShowRecoveryPrompt(false)

      if (onDiscard) {
        onDiscard()
      }
    } catch (error) {
      console.error('Error discarding draft:', error)
    }
  }, [entityType, entityId, onDiscard])

  /**
   * Dismiss recovery prompt without action
   */
  const dismissPrompt = useCallback(() => {
    setShowRecoveryPrompt(false)
  }, [])

  /**
   * Check for draft on mount
   */
  useEffect(() => {
    checkForDraft()
  }, [checkForDraft])

  return {
    hasDraft: draft !== null,
    draft,
    isChecking,
    recoverDraft,
    discardDraft,
    dismissPrompt,
    showRecoveryPrompt,
  }
}
