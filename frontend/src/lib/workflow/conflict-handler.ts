/**
 * Conflict Handler
 * 
 * Detects and handles draft conflicts when multiple sessions
 * edit the same draft simultaneously.
 */

import type { DraftWork } from '@/types/workflow'

export interface ConflictInfo {
  type: 'version_mismatch' | 'concurrent_edit'
  serverVersion: number
  clientVersion: number
  serverDraft: DraftWork | null
  clientData: Record<string, any>
  message: string
}

export type ConflictResolution = 'keep_server' | 'keep_client' | 'manual_merge'

export class ConflictHandler {
  /**
   * Detect if an error response is a conflict
   */
  isConflictError(error: any): boolean {
    if (!error) return false
    
    // Check for conflict type
    if (error.type === 'conflict') return true
    
    // Check HTTP status
    if (error.status === 409 || error?.response?.status === 409) return true
    
    // Check error details
    if (error.error?.includes('conflict') || error.error?.includes('Conflict')) return true
    
    return false
  }

  /**
   * Extract conflict information from error
   */
  extractConflictInfo(error: any): ConflictInfo | null {
    if (!this.isConflictError(error)) return null

    try {
      const details = error.error?.conflict || error?.response?.data?.conflict || {}
      
      return {
        type: details.conflict_type || 'version_mismatch',
        serverVersion: details.server_version || 0,
        clientVersion: details.client_version || 0,
        serverDraft: details.server_draft || error.error?.server_draft || null,
        clientData: error.clientData || {},
        message: details.message || 'A conflict was detected while saving your draft.',
      }
    } catch (e) {
      console.error('Error extracting conflict info:', e)
      return null
    }
  }

  /**
   * Resolve conflict by choosing a resolution strategy
   */
  resolveConflict(
    conflictInfo: ConflictInfo,
    resolution: ConflictResolution
  ): Record<string, any> {
    switch (resolution) {
      case 'keep_server':
        // Use server's version
        return conflictInfo.serverDraft?.draftData || {}
      
      case 'keep_client':
        // Use client's version
        return conflictInfo.clientData
      
      case 'manual_merge':
        // Attempt automatic merge (prefer client for most fields)
        return this.attemptAutoMerge(
          conflictInfo.serverDraft?.draftData || {},
          conflictInfo.clientData
        )
      
      default:
        // Default to server data for safety
        console.warn(`Unknown resolution strategy: ${resolution}, defaulting to server data`)
        return conflictInfo.serverDraft?.draftData || {}
    }
  }

  /**
   * Attempt to automatically merge server and client data
   */
  private attemptAutoMerge(
    serverData: Record<string, any>,
    clientData: Record<string, any>
  ): Record<string, any> {
    const merged = { ...serverData }

    // Merge fields from client, preferring non-empty values
    for (const [key, clientValue] of Object.entries(clientData)) {
      const serverValue = serverData[key]

      // If client has a value and server doesn't, use client
      if (clientValue && !serverValue) {
        merged[key] = clientValue
        continue
      }

      // If both have values, prefer client (last-write-wins)
      if (clientValue) {
        merged[key] = clientValue
      }
    }

    return merged
  }

  /**
   * Check if auto-merge is safe (no conflicting changes)
   */
  canAutoMerge(
    serverData: Record<string, any>,
    clientData: Record<string, any>
  ): boolean {
    const serverKeys = Object.keys(serverData)
    const clientKeys = Object.keys(clientData)
    
    // Get keys that exist in both
    const commonKeys = serverKeys.filter(key => clientKeys.includes(key))
    
    // Check for conflicting values
    for (const key of commonKeys) {
      const serverValue = JSON.stringify(serverData[key])
      const clientValue = JSON.stringify(clientData[key])
      
      // If values differ, there's a conflict
      if (serverValue !== clientValue && serverValue && clientValue) {
        return false
      }
    }
    
    // No conflicts found - safe to auto-merge
    return true
  }

  /**
   * Get user-friendly conflict message
   */
  getConflictMessage(conflictInfo: ConflictInfo): string {
    const { type, serverVersion, clientVersion } = conflictInfo
    
    if (type === 'version_mismatch') {
      return `Your draft (version ${clientVersion}) conflicts with a newer version on the server (version ${serverVersion}). This usually happens when the same draft is edited in multiple tabs or by another user.`
    }
    
    return conflictInfo.message || 'A conflict was detected. Please choose how to resolve it.'
  }

  /**
   * Get recommendation for conflict resolution
   */
  getRecommendedResolution(conflictInfo: ConflictInfo): ConflictResolution {
    // If auto-merge is safe, recommend it
    if (this.canAutoMerge(
      conflictInfo.serverDraft?.draftData || {},
      conflictInfo.clientData
    )) {
      return 'manual_merge'
    }
    
    // Otherwise, recommend keeping client changes (last-write-wins)
    return 'keep_client'
  }
}

// Global instance
export const conflictHandler = new ConflictHandler()
