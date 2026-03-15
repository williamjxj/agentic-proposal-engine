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
  /** If true, skip the API call when cache is empty. Use when we don't expect a server-side draft (e.g. first visit, no prior auto-save). */
  skipApiWhenCacheEmpty?: boolean
}

type DraftWorkApiResponse = Partial<DraftWork> & {
  user_id?: string
  entity_type?: string
  entity_id?: string | null
  draft_data?: Record<string, any>
  draft_version?: number
  auto_save_count?: number
  last_auto_save_at?: string | null
  is_recovered?: boolean
  recovered_at?: string | null
  expires_at?: string
  created_at?: string
  updated_at?: string
  version?: number
  last_saved_at?: string | null
}

export class DraftManager {
  private normalizeDraftWork(raw: DraftWorkApiResponse | null): DraftWork | null {
    if (!raw) {
      return null
    }

    return {
      id: String(raw.id || ''),
      userId: String(raw.userId || raw.user_id || ''),
      entityType: ((raw.entityType || raw.entity_type || 'proposal') as DraftWork['entityType']),
      entityId: (raw.entityId ?? raw.entity_id ?? null) as string | null,
      draftData: (raw.draftData || raw.draft_data || {}) as Record<string, any>,
      draftVersion: Number(raw.draftVersion ?? raw.draft_version ?? raw.version ?? 1),
      autoSaveCount: Number(raw.autoSaveCount ?? raw.auto_save_count ?? 0),
      lastAutoSaveAt: (raw.lastAutoSaveAt ?? raw.last_auto_save_at ?? raw.lastSavedAt ?? raw.last_saved_at ?? null) as string | null,
      isRecovered: Boolean(raw.isRecovered ?? raw.is_recovered ?? false),
      recoveredAt: (raw.recoveredAt ?? raw.recovered_at ?? null) as string | null,
      expiresAt: String(raw.expiresAt || raw.expires_at || new Date().toISOString()),
      createdAt: String(raw.createdAt || raw.created_at || new Date().toISOString()),
      updatedAt: String(raw.updatedAt || raw.updated_at || new Date().toISOString()),
    }
  }

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

      // Save to server (backend expects snake_case: draft_data, version)
      const entityIdParam = entityId || 'new'
      const result = await apiSaveDraft(entityType, entityIdParam, {
        draft_data: draftData,
        version,
      })

      return this.normalizeDraftWork(result as DraftWorkApiResponse)
    } catch (error: any) {
      console.error('Error saving draft:', error)

      // Check if it's a conflict error (409)
      const status = error?.status || error?.response?.status
      const message = String(error?.message || error || '').toLowerCase()
      if (status === 409 || message.includes('conflict')) {
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
    const { entityType, entityId, useCache = true, skipApiWhenCacheEmpty = false } = options

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
        // Cache empty and skipApiWhenCacheEmpty: don't call API (no draft to recover)
        if (skipApiWhenCacheEmpty) {
          return null
        }
      }

      // Fetch from server (only when cache missed and we didn't skip)
      const entityIdParam = entityId || 'new'
      const result = this.normalizeDraftWork(
        (await apiGetDraft(entityType, entityIdParam)) as DraftWorkApiResponse
      )

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
      const result = await apiListDrafts()
      return (result || [])
        .map((item) => this.normalizeDraftWork(item as DraftWorkApiResponse))
        .filter((item): item is DraftWork => item !== null)
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
