/**
 * Draft Manager
 * 
 * Client-side draft management with API integration.
 * Handles saving, retrieving, and deleting drafts with conflict detection.
 */

import { saveDraft as apiSaveDraft, getDraft as apiGetDraft, discardDraft as apiDiscardDraft, listDrafts as apiListDrafts } from '@/lib/api/client'
import { DraftCache } from './storage-utils'
import type { DraftWork } from '@/types/workflow'

export interface DraftSaveOptions {
  entityType: string
  entityId: string | null
  draftData: Record<string, any>
  version: number
  enableCache?: boolean
}

export interface DraftGetOptions {
  entityType: string
  entityId: string | null
  useCache?: boolean
}

export class DraftManager {
  /**
   * Save draft to server with optional local caching
   */
  async saveDraft(options: DraftSaveOptions): Promise<DraftWork | null> {
    const { entityType, entityId, draftData, version, enableCache = true } = options

    try {
      // Save to cache first for optimistic update
      if (enableCache) {
        await DraftCache.set(entityType, entityId, draftData)
      }

      // Save to server
      const entityIdParam = entityId || 'new'
      const result = await apiSaveDraft(entityType, entityIdParam, {
        draftData,
        expectedVersion: version,
      })

      return result
    } catch (error: any) {
      console.error('Error saving draft:', error)

      // Check if it's a conflict error (409)
      if (error?.status === 409 || error?.response?.status === 409) {
        // Re-throw conflict errors so they can be handled by the UI
        throw {
          type: 'conflict',
          message: 'Version conflict detected',
          error,
        }
      }

      // For other errors, keep cached version but notify user
      throw {
        type: 'save_failed',
        message: 'Failed to save draft to server',
        error,
      }
    }
  }

  /**
   * Get draft from server or cache
   */
  async getDraft(options: DraftGetOptions): Promise<DraftWork | null> {
    const { entityType, entityId, useCache = true } = options

    try {
      // Try cache first if enabled
      if (useCache) {
        const cached = await DraftCache.get(entityType, entityId)
        if (cached) {
          console.debug('Draft loaded from cache')
          return {
            id: 'cached',
            userId: '',
            entityType: entityType as DraftWork['entityType'],
            entityId: entityId ?? null,
            draftData: cached,
            draftVersion: 0,
            autoSaveCount: 0,
            isRecovered: false,
            expiresAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        }
      }

      // Fetch from server
      const entityIdParam = entityId || 'new'
      const result = await apiGetDraft(entityType, entityIdParam)

      // Update cache with server data
      if (result && useCache) {
        await DraftCache.set(entityType, entityId, result.draftData)
      }

      return result
    } catch (error) {
      console.error('Error getting draft:', error)
      
      // If server fetch fails, try cache as fallback
      if (useCache) {
        const cached = await DraftCache.get(entityType, entityId)
        if (cached) {
          console.debug('Draft loaded from cache (server failed)')
          return {
            id: 'cached',
            userId: '',
            entityType: entityType as DraftWork['entityType'],
            entityId: entityId ?? null,
            draftData: cached,
            draftVersion: 0,
            autoSaveCount: 0,
            isRecovered: false,
            expiresAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }
        }
      }

      return null
    }
  }

  /**
   * Delete draft from server and cache
   */
  async deleteDraft(entityType: string, entityId: string | null): Promise<void> {
    try {
      // Delete from server
      const entityIdParam = entityId || 'new'
      await apiDiscardDraft(entityType, entityIdParam)

      // Delete from cache
      await DraftCache.remove(entityType, entityId)
    } catch (error) {
      console.error('Error deleting draft:', error)
      // Still remove from cache even if server delete fails
      await DraftCache.remove(entityType, entityId)
      throw error
    }
  }

  /**
   * List all drafts for current user
   */
  async listDrafts(): Promise<DraftWork[]> {
    try {
      return await apiListDrafts()
    } catch (error) {
      console.error('Error listing drafts:', error)
      return []
    }
  }

  /**
   * Clear draft cache (useful for cleanup)
   */
  async clearCache(): Promise<void> {
    try {
      await DraftCache.clear()
    } catch (error) {
      console.error('Error clearing draft cache:', error)
    }
  }
}

// Global instance
export const draftManager = new DraftManager()
