/**
 * Storage Utilities for Workflow Optimization
 * 
 * Provides helper functions for localStorage and IndexedDB operations
 * used in session state management and offline queue.
 */

import { openDB, DBSchema, IDBPDatabase } from 'idb'

// IndexedDB Schema
interface WorkflowDB extends DBSchema {
  'offline-queue': {
    key: string
    value: {
      id: string
      operation: 'create' | 'update' | 'delete'
      entityType: string
      entityId?: string | null
      data?: Record<string, any>
      timestamp: string
      version?: number | null
    }
  }
  'drafts-cache': {
    key: string
    value: {
      entityType: string
      entityId: string  // Changed from string | null to string (we normalize null to 'new')
      draftData: Record<string, any>
      cachedAt: string
    }
  }
}

// IndexedDB instance
let db: IDBPDatabase<WorkflowDB> | null = null

/**
 * Initialize IndexedDB database
 */
async function initDB(): Promise<IDBPDatabase<WorkflowDB>> {
  if (db) return db

  db = await openDB<WorkflowDB>('workflow-db', 1, {
    upgrade(db) {
      // Create offline queue store
      if (!db.objectStoreNames.contains('offline-queue')) {
        db.createObjectStore('offline-queue', { keyPath: 'id' })
      }
      
      // Create drafts cache store
      if (!db.objectStoreNames.contains('drafts-cache')) {
        db.createObjectStore('drafts-cache', { keyPath: ['entityType', 'entityId'] })
      }
    },
  })

  return db
}

/**
 * localStorage Utilities
 */

export const LocalStorage = {
  /**
   * Get item from localStorage with JSON parsing
   */
  get<T>(key: string, defaultValue: T): T {
    if (typeof window === 'undefined') return defaultValue
    
    try {
      const item = localStorage.getItem(key)
      return item ? JSON.parse(item) : defaultValue
    } catch (error) {
      console.error(`Error reading from localStorage key "${key}":`, error)
      return defaultValue
    }
  },

  /**
   * Set item in localStorage with JSON stringification
   */
  set<T>(key: string, value: T): boolean {
    if (typeof window === 'undefined') return false
    
    try {
      localStorage.setItem(key, JSON.stringify(value))
      return true
    } catch (error) {
      console.error(`Error writing to localStorage key "${key}":`, error)
      return false
    }
  },

  /**
   * Remove item from localStorage
   */
  remove(key: string): void {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.removeItem(key)
    } catch (error) {
      console.error(`Error removing from localStorage key "${key}":`, error)
    }
  },

  /**
   * Check if localStorage is available
   */
  isAvailable(): boolean {
    if (typeof window === 'undefined') return false
    
    try {
      const testKey = '__localStorage_test__'
      localStorage.setItem(testKey, 'test')
      localStorage.removeItem(testKey)
      return true
    } catch {
      return false
    }
  },
}

/**
 * IndexedDB Utilities for Offline Queue
 */

export const OfflineQueue = {
  /**
   * Add change to offline queue
   */
  async add(change: WorkflowDB['offline-queue']['value']): Promise<void> {
    try {
      const database = await initDB()
      await database.add('offline-queue', change)
    } catch (error) {
      console.error('Error adding to offline queue:', error)
      throw error
    }
  },

  /**
   * Get all changes from offline queue
   */
  async getAll(): Promise<WorkflowDB['offline-queue']['value'][]> {
    try {
      const database = await initDB()
      return await database.getAll('offline-queue')
    } catch (error) {
      console.error('Error reading offline queue:', error)
      return []
    }
  },

  /**
   * Remove change from offline queue
   */
  async remove(id: string): Promise<void> {
    try {
      const database = await initDB()
      await database.delete('offline-queue', id)
    } catch (error) {
      console.error('Error removing from offline queue:', error)
    }
  },

  /**
   * Remove multiple changes from offline queue
   */
  async removeMany(ids: string[]): Promise<void> {
    try {
      const database = await initDB()
      const tx = database.transaction('offline-queue', 'readwrite')
      await Promise.all(ids.map(id => tx.store.delete(id)))
      await tx.done
    } catch (error) {
      console.error('Error removing multiple from offline queue:', error)
    }
  },

  /**
   * Clear all changes from offline queue
   */
  async clear(): Promise<void> {
    try {
      const database = await initDB()
      await database.clear('offline-queue')
    } catch (error) {
      console.error('Error clearing offline queue:', error)
    }
  },

  /**
   * Get queue size
   */
  async count(): Promise<number> {
    try {
      const database = await initDB()
      return await database.count('offline-queue')
    } catch (error) {
      console.error('Error counting offline queue:', error)
      return 0
    }
  },
}

/**
 * IndexedDB Utilities for Draft Cache
 */

export const DraftCache = {
  /**
   * Set draft in cache
   */
  async set(
    entityType: string,
    entityId: string | null,
    draftData: Record<string, any>
  ): Promise<void> {
    try {
      const database = await initDB()
      // Use 'new' for null entityId to avoid IndexedDB invalid key error
      const normalizedEntityId = entityId ?? 'new'
      await database.put('drafts-cache', {
        entityType,
        entityId: normalizedEntityId,
        draftData,
        cachedAt: new Date().toISOString(),
      })
    } catch (error) {
      console.error('Error caching draft:', error)
    }
  },

  /**
   * Get draft from cache
   */
  async get(
    entityType: string,
    entityId: string | null
  ): Promise<Record<string, any> | null> {
    try {
      const database = await initDB()
      // Use 'new' as key for null entityId to avoid IndexedDB invalid key error
      const key = [entityType, entityId ?? 'new']
      const cached = await database.get('drafts-cache', key)
      return cached?.draftData || null
    } catch (error) {
      console.error('Error reading cached draft:', error)
      return null
    }
  },

  /**
   * Remove draft from cache
   */
  async remove(entityType: string, entityId: string | null): Promise<void> {
    try {
      const database = await initDB()
      // Use 'new' as key for null entityId to avoid IndexedDB invalid key error
      const key = [entityType, entityId ?? 'new']
      await database.delete('drafts-cache', key)
    } catch (error) {
      console.error('Error removing cached draft:', error)
    }
  },

  /**
   * Clear all drafts from cache
   */
  async clear(): Promise<void> {
    try {
      const database = await initDB()
      await database.clear('drafts-cache')
    } catch (error) {
      console.error('Error clearing draft cache:', error)
    }
  },
}

/**
 * Browser Feature Detection
 */

export const BrowserSupport = {
  /**
   * Check if IndexedDB is available
   */
  hasIndexedDB(): boolean {
    if (typeof window === 'undefined') return false
    return 'indexedDB' in window && window.indexedDB !== null
  },

  /**
   * Check if localStorage is available
   */
  hasLocalStorage(): boolean {
    return LocalStorage.isAvailable()
  },

  /**
   * Check if Performance API is available
   */
  hasPerformanceAPI(): boolean {
    if (typeof window === 'undefined') return false
    return 'performance' in window && typeof window.performance.mark === 'function'
  },

  /**
   * Check if online/offline events are available
   */
  hasOnlineEvents(): boolean {
    if (typeof window === 'undefined') return false
    return 'onLine' in navigator
  },

  /**
   * Get comprehensive browser support status
   */
  getSupport() {
    return {
      localStorage: this.hasLocalStorage(),
      indexedDB: this.hasIndexedDB(),
      performanceAPI: this.hasPerformanceAPI(),
      onlineEvents: this.hasOnlineEvents(),
    }
  },

  /**
   * Check if all required features are available
   */
  isFullySupported(): boolean {
    const support = this.getSupport()
    return support.localStorage && support.indexedDB
  },

  /**
   * Get list of missing features
   */
  getMissingFeatures(): string[] {
    const support = this.getSupport()
    const missing: string[] = []
    
    if (!support.localStorage) missing.push('localStorage')
    if (!support.indexedDB) missing.push('IndexedDB (offline support)')
    if (!support.performanceAPI) missing.push('Performance API (metrics tracking)')
    if (!support.onlineEvents) missing.push('Online/offline events')
    
    return missing
  },
}
