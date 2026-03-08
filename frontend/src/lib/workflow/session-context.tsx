/**
 * Workflow Session Context
 * 
 * Provides React Context for managing workflow session state across the application.
 * Handles navigation history, active entity tracking, and auto-save coordination.
 */

'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import type { SessionState, NavigationEntry } from '@/types/workflow'
import { LocalStorage, BrowserSupport } from './storage-utils'
import { getSessionState, updateSessionState, recordWorkflowEvent } from '@/lib/api/client'

// Session Context Type
interface SessionContextType {
  sessionState: SessionState | null
  isLoading: boolean
  isOnline: boolean
  updateNavigation: (path: string, entityType?: string, entityId?: string) => Promise<void>
  updateActiveEntity: (entityType: string | null, entityId: string | null) => Promise<void>
  setFilters: (path: string, filters: any) => Promise<void>
  setScrollPosition: (path: string, position: number) => Promise<void>
  setUIState: (path: string, uiState: any) => Promise<void>
  pushNavigation: (entry: NavigationEntry) => void
  popNavigation: () => void
  getNavigationHistory: () => NavigationEntry[]
  clearSession: () => Promise<void>
  syncWithServer: () => Promise<void>
}

const SessionContext = createContext<SessionContextType | null>(null)

// Local storage key
const SESSION_STORAGE_KEY = 'workflow-session-state'
const SYNC_INTERVAL_MS = 30000 // Sync every 30 seconds

/**
 * Session Context Provider
 */
export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [sessionState, setSessionState] = useState<SessionState | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isOnline, setIsOnline] = useState(true)
  const router = useRouter()
  const pathname = usePathname()

  // Use a ref to always have the latest state in callbacks without re-creating them
  const stateRef = React.useRef<SessionState | null>(null)
  const lastSyncRef = React.useRef<number>(0)
  const syncWithServerRef = React.useRef<((force?: boolean) => Promise<void>) | null>(null)
  const lastTrackedPathRef = React.useRef<string | null>(null)

  useEffect(() => {
    stateRef.current = sessionState
  }, [sessionState])

  /**
   * Sync session state with server
   * TEMPORARILY DISABLED to prevent infinite loop
   */
  const syncWithServer = useCallback(async (force = false) => {
    const currentState = stateRef.current
    if (!currentState || !navigator.onLine) return

    // Debounce: don't sync more than once every 2 seconds unless forced
    const now = Date.now()
    if (!force && now - lastSyncRef.current < 2000) {
      return
    }
    lastSyncRef.current = now

    try {
      const updated = await updateSessionState({
        current_path: currentState.current_path,
        navigation_history: currentState.navigation_history,
        active_entity_type: currentState.active_entity_type,
        active_entity_id: currentState.active_entity_id,
        scroll_position: currentState.scroll_position,
        filters: currentState.filters,
        ui_state: currentState.ui_state,
      })

      if (updated) {
        // Only update if state actually changed to prevent infinite loops
        const currentStateStr = JSON.stringify(currentState)
        const updatedStr = JSON.stringify(updated)
        if (currentStateStr !== updatedStr) {
          setSessionState(updated)
          LocalStorage.set(SESSION_STORAGE_KEY, updated)
        }
      }
    } catch (error) {
      // Silently fail - don't log 404s as errors (backend might not be running)
      if (error && typeof error === 'object' && 'status' in error && error.status !== 404) {
        console.error('Error syncing session with server:', error)
      }
    }
  }, []) // No dependencies - uses refs and navigator.onLine directly

  // Update ref when syncWithServer changes
  useEffect(() => {
    syncWithServerRef.current = syncWithServer
  }, [syncWithServer])

  /**
   * Update navigation state
   */
  const updateNavigation = useCallback(
    async (path: string, entityType?: string, entityId?: string) => {
      const currentState = stateRef.current

      // Avoid redundant updates
      if (
        currentState?.current_path === path &&
        currentState?.active_entity_type === (entityType || null) &&
        currentState?.active_entity_id === (entityId || null)
      ) {
        return
      }

      const newState: SessionState = {
        id: currentState?.id || crypto.randomUUID(),
        user_id: currentState?.user_id || '',
        current_path: path,
        active_entity_type: entityType !== undefined ? entityType : (currentState?.active_entity_type || null),
        active_entity_id: entityId !== undefined ? entityId : (currentState?.active_entity_id || null),
        navigation_history: currentState?.navigation_history || [],
        scroll_position: currentState?.scroll_position || {},
        filters: currentState?.filters || {},
        ui_state: currentState?.ui_state || {},
        last_activity_at: new Date().toISOString(),
        created_at: currentState?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      setSessionState(newState)
      LocalStorage.set(SESSION_STORAGE_KEY, newState)

      // TEMPORARILY DISABLED - API calls causing infinite loop
      // Sync with server if online (debounced)
      if (isOnline) {
        try {
          // Use syncWithServer which has debouncing built-in
          await syncWithServer(true)
        } catch (error) {
          // Silently fail - don't log 404s as errors (backend might not be running)
          if (error && typeof error === 'object' && 'status' in error && error.status !== 404) {
            console.error('Error updating navigation on server:', error)
          }
        }
      }

      // Record analytics event (fire and forget, don't block)
      recordWorkflowEvent({
        event_type: 'navigation',
        entity_type: entityType || null,
        entity_id: entityId || null,
        metadata: { from: currentState?.current_path, to: path },
      }).catch(() => {
        // Silently fail analytics
      })
    },
    [isOnline, syncWithServer]
  )

  // Check browser support on mount
  useEffect(() => {
    const support = BrowserSupport.getSupport()
    if (!support.localStorage) {
      console.warn('localStorage not available - session state will not persist')
    }
    if (!support.indexedDB) {
      console.warn('IndexedDB not available - offline features disabled')
    }
  }, [])

  // Initialize session state from localStorage or server
  useEffect(() => {
    async function initSession() {
      try {
        // Try loading from localStorage first (faster)
        const cached = LocalStorage.get<SessionState | null>(SESSION_STORAGE_KEY, null)

        if (cached) {
          setSessionState(cached)
          setIsLoading(false)

          // Sync with server in background
          syncWithServer()
        } else {
          // Load from server
          const serverState = await getSessionState()
          if (serverState) {
            setSessionState(serverState)
            LocalStorage.set(SESSION_STORAGE_KEY, serverState)
          }
          setIsLoading(false)
        }
      } catch (error) {
        console.error('Error initializing session:', error)
        setIsLoading(false)
      }
    }

    initSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount

  // Monitor online/offline status
  useEffect(() => {
    if (!BrowserSupport.hasOnlineEvents()) return

    function handleOnline() {
      setIsOnline(true)
      // Use ref to call syncWithServer to avoid dependency issues
      if (syncWithServerRef.current) {
        syncWithServerRef.current()
      }
    }

    function handleOffline() {
      setIsOnline(false)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    // Set initial state
    setIsOnline(navigator.onLine)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, []) // Only set up once

  // Periodic sync with server
  useEffect(() => {
    if (!sessionState || !isOnline) return

    const interval = setInterval(() => {
      // Use ref to avoid dependency issues
      if (syncWithServerRef.current) {
        syncWithServerRef.current()
      }
    }, SYNC_INTERVAL_MS)

    return () => clearInterval(interval)
  }, [sessionState?.id, isOnline]) // Only re-run if session ID changes or online status changes

  // Track route changes (client-side navigation)
  useEffect(() => {
    if (!pathname) return

    // Skip if we already tracked this path (prevents duplicate calls when sidebar click + effect both fire)
    if (lastTrackedPathRef.current === pathname) return

    // Skip if session state already matches (prevents update->setState->re-render->update loop)
    if (sessionState?.current_path === pathname) {
      lastTrackedPathRef.current = pathname
      return
    }

    lastTrackedPathRef.current = pathname
    updateNavigation(pathname)
  }, [pathname, sessionState?.current_path, updateNavigation])


  /**
   * Update active entity
   */
  const updateActiveEntity = useCallback(
    async (entityType: string | null, entityId: string | null) => {
      const currentState = stateRef.current
      if (!currentState) return

      const newState: SessionState = {
        ...currentState,
        active_entity_type: entityType,
        active_entity_id: entityId,
        updated_at: new Date().toISOString(),
      }

      setSessionState(newState)
      LocalStorage.set(SESSION_STORAGE_KEY, newState)

      if (isOnline) {
        try {
          // Use syncWithServer which has debouncing built-in
          await syncWithServer(true)
        } catch (error) {
          // Silently fail - don't log 404s as errors (backend might not be running)
          if (error && typeof error === 'object' && 'status' in error && error.status !== 404) {
            console.error('Error updating active entity on server:', error)
          }
        }
      }
    },
    [isOnline, syncWithServer]
  )

  /**
   * Set filters for a path
   */
  const setFilters = useCallback(
    async (path: string, filters: any) => {
      const currentState = stateRef.current
      if (!currentState) return

      // Simple equality check to avoid redundant updates
      if (JSON.stringify(currentState.filters[path]) === JSON.stringify(filters)) {
        return
      }

      const newState: SessionState = {
        ...currentState,
        filters: {
          ...currentState.filters,
          [path]: filters,
        },
        updated_at: new Date().toISOString(),
      }

      setSessionState(newState)
      LocalStorage.set(SESSION_STORAGE_KEY, newState)

      if (isOnline) {
        // Use syncWithServer which has debouncing built-in
        try {
          await syncWithServer(true)
        } catch (error) {
          // Silently fail - don't log 404s as errors (backend might not be running)
          if (error && typeof error === 'object' && 'status' in error && error.status !== 404) {
            console.error('Error updating filters on server:', error)
          }
        }
      }
    },
    [isOnline, syncWithServer]
  )

  /**
   * Set scroll position for a path
   */
  const setScrollPosition = useCallback(
    async (path: string, position: number) => {
      const currentState = stateRef.current
      if (!currentState) return

      if (currentState.scroll_position[path] === position) {
        return
      }

      const newState: SessionState = {
        ...currentState,
        scroll_position: {
          ...currentState.scroll_position,
          [path]: position,
        },
        updated_at: new Date().toISOString(),
      }

      setSessionState(newState)
      LocalStorage.set(SESSION_STORAGE_KEY, newState)

      if (isOnline) {
        // Use syncWithServer which has debouncing built-in
        try {
          await syncWithServer(true)
        } catch (error) {
          // Silently fail - don't log 404s as errors (backend might not be running)
          if (error && typeof error === 'object' && 'status' in error && error.status !== 404) {
            console.error('Error updating scroll position on server:', error)
          }
        }
      }
    },
    [isOnline, syncWithServer]
  )

  /**
   * Set UI state for a path
   */
  const setUIState = useCallback(
    async (path: string, uiState: any) => {
      const currentState = stateRef.current
      if (!currentState) return

      if (JSON.stringify(currentState.ui_state[path]) === JSON.stringify(uiState)) {
        return
      }

      const newState: SessionState = {
        ...currentState,
        ui_state: {
          ...currentState.ui_state,
          [path]: uiState,
        },
        updated_at: new Date().toISOString(),
      }

      setSessionState(newState)
      LocalStorage.set(SESSION_STORAGE_KEY, newState)

      if (isOnline) {
        try {
          // Use syncWithServer which has debouncing built-in
          await syncWithServer(true)
        } catch (error) {
          // Silently fail - don't log 404s as errors (backend might not be running)
          if (error && typeof error === 'object' && 'status' in error && error.status !== 404) {
            console.error('Error updating UI state on server:', error)
          }
        }
      }
    },
    [isOnline, syncWithServer]
  )

  /**
   * Push navigation entry to history
   */
  const pushNavigation = useCallback(
    (entry: NavigationEntry) => {
      if (!sessionState) return

      const history = [...(sessionState.navigation_history || []), entry]

      // Keep only last 50 entries
      const trimmedHistory = history.slice(-50)

      const newState: SessionState = {
        ...sessionState,
        navigation_history: trimmedHistory,
        updated_at: new Date().toISOString(),
      }

      setSessionState(newState)
      LocalStorage.set(SESSION_STORAGE_KEY, newState)
    },
    [sessionState]
  )

  /**
   * Pop navigation entry from history
   */
  const popNavigation = useCallback(() => {
    if (!sessionState || !sessionState.navigation_history?.length) return

    const history = [...sessionState.navigation_history]
    const previousEntry = history.pop()

    const newState: SessionState = {
      ...sessionState,
      navigation_history: history,
      updated_at: new Date().toISOString(),
    }

    setSessionState(newState)
    LocalStorage.set(SESSION_STORAGE_KEY, newState)

    // Navigate to previous path
    if (previousEntry?.path) {
      router.push(previousEntry.path)
    }
  }, [sessionState, router])

  /**
   * Get navigation history
   */
  const getNavigationHistory = useCallback(() => {
    return sessionState?.navigation_history || []
  }, [sessionState])

  /**
   * Clear session state
   */
  const clearSession = useCallback(async () => {
    setSessionState(null)
    LocalStorage.remove(SESSION_STORAGE_KEY)

    if (isOnline) {
      try {
        // Server-side clear will be implemented in user story tasks
        // await deleteSessionState()
      } catch (error) {
        console.error('Error clearing session on server:', error)
      }
    }
  }, [isOnline])

  const value: SessionContextType = {
    sessionState,
    isLoading,
    isOnline,
    updateNavigation,
    updateActiveEntity,
    setFilters,
    setScrollPosition,
    setUIState,
    pushNavigation,
    popNavigation,
    getNavigationHistory,
    clearSession,
    syncWithServer,
  }

  return (
    <SessionContext.Provider value={value}>
      {children}
    </SessionContext.Provider>
  )
}

/**
 * Hook to access session context
 */
export function useWorkflowSession() {
  const context = useContext(SessionContext)

  if (!context) {
    throw new Error('useWorkflowSession must be used within WorkflowProvider')
  }

  return context
}
