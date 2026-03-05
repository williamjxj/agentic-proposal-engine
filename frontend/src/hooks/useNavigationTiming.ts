/**
 * useNavigationTiming Hook
 * 
 * Tracks navigation performance using the Performance API.
 * Records timing data for analytics to monitor workflow optimization success.
 */

'use client'

import { useEffect, useRef, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { recordWorkflowEvent } from '@/lib/api/client'
import { BrowserSupport } from '@/lib/workflow/storage-utils'

interface NavigationTiming {
  path: string
  startTime: number
  endTime: number
  duration: number
}

/**
 * Hook to track navigation timing and send to analytics
 */
export function useNavigationTiming() {
  const pathname = usePathname()
  const startTimeRef = useRef<number | null>(null)
  const previousPathRef = useRef<string | null>(null)
  const hasPerformanceAPI = BrowserSupport.hasPerformanceAPI()

  // Mark navigation start
  const markNavigationStart = useCallback((path: string) => {
    if (!hasPerformanceAPI) return

    try {
      const markName = `nav-start-${path}`
      window.performance.mark(markName)
      startTimeRef.current = window.performance.now()
    } catch (error) {
      console.error('Error marking navigation start:', error)
    }
  }, [hasPerformanceAPI])

  // Mark navigation end and calculate duration
  const markNavigationEnd = useCallback((path: string) => {
    if (!hasPerformanceAPI || !startTimeRef.current) return

    try {
      const endTime = window.performance.now()
      const duration = endTime - startTimeRef.current

      const markName = `nav-end-${path}`
      window.performance.mark(markName)

      // Create measure
      const measureName = `nav-duration-${path}`
      try {
        window.performance.measure(measureName, `nav-start-${path}`, markName)
      } catch (e) {
        // Measure might fail if marks don't exist
        console.debug('Could not create performance measure:', e)
      }

      // Record timing data
      const timing: NavigationTiming = {
        path,
        startTime: startTimeRef.current,
        endTime,
        duration,
      }

      // Send to analytics if duration is significant (>50ms)
      if (duration > 50) {
        recordNavigationTiming(timing)
      }

      // Reset for next navigation
      startTimeRef.current = null
    } catch (error) {
      console.error('Error marking navigation end:', error)
    }
  }, [hasPerformanceAPI])

  // Send timing data to analytics (re-enabled after URL construction fix)
  const recordNavigationTiming = useCallback(async (timing: NavigationTiming) => {
    try {
      await recordWorkflowEvent({
        event_type: 'page_transition',
        entity_type: null,
        entity_id: null,
        metadata: {
          from: previousPathRef.current || '/',
          to: timing.path,
          duration_ms: Math.round(timing.duration),
          start_time: timing.startTime,
          end_time: timing.endTime,
        },
      })

      // Log slow navigations (>500ms target)
      if (timing.duration > 500) {
        console.warn(
          `Slow navigation detected: ${timing.path} took ${Math.round(timing.duration)}ms (target: <500ms)`
        )
      }
    } catch (error) {
      // Don't throw - analytics is non-critical
      console.error('Error recording navigation timing:', error)
    }
  }, [])

  // Track route changes
  useEffect(() => {
    if (!pathname) return

    // If we have a previous path, mark its end
    if (previousPathRef.current && previousPathRef.current !== pathname) {
      markNavigationEnd(previousPathRef.current)
    }

    // Mark start of new navigation
    markNavigationStart(pathname)
    previousPathRef.current = pathname

    // Cleanup function to mark end when component unmounts or path changes
    return () => {
      if (pathname) {
        markNavigationEnd(pathname)
      }
    }
  }, [pathname, markNavigationStart, markNavigationEnd])

  /**
   * Manually measure a specific operation
   */
  const measureOperation = useCallback((
    operationName: string,
    callback: () => void | Promise<void>
  ) => {
    if (!hasPerformanceAPI) {
      // Fallback: just execute callback without timing
      return callback()
    }

    const startMark = `op-start-${operationName}`
    const endMark = `op-end-${operationName}`
    const measureName = `op-${operationName}`

    try {
      window.performance.mark(startMark)
      const startTime = window.performance.now()

      const result = callback()

      // If callback returns a promise, wait for it
      if (result instanceof Promise) {
        return result.finally(() => {
          const endTime = window.performance.now()
          const duration = endTime - startTime

          window.performance.mark(endMark)
          try {
            window.performance.measure(measureName, startMark, endMark)
          } catch (e) {
            console.debug('Could not create performance measure:', e)
          }

          console.debug(`Operation "${operationName}" took ${Math.round(duration)}ms`)
        })
      } else {
        const endTime = window.performance.now()
        const duration = endTime - startTime

        window.performance.mark(endMark)
        try {
          window.performance.measure(measureName, startMark, endMark)
        } catch (e) {
          console.debug('Could not create performance measure:', e)
        }

        console.debug(`Operation "${operationName}" took ${Math.round(duration)}ms`)
        return result
      }
    } catch (error) {
      console.error(`Error measuring operation "${operationName}":`, error)
      return callback()
    }
  }, [hasPerformanceAPI])

  /**
   * Get performance metrics for current session
   */
  const getPerformanceMetrics = useCallback(() => {
    if (!hasPerformanceAPI) {
      return null
    }

    try {
      const entries = window.performance.getEntriesByType('measure')
      const navEntries = entries.filter(entry => entry.name.startsWith('nav-duration-'))

      return {
        totalNavigations: navEntries.length,
        averageDuration: navEntries.length > 0
          ? navEntries.reduce((sum, entry) => sum + entry.duration, 0) / navEntries.length
          : 0,
        slowNavigations: navEntries.filter(entry => entry.duration > 500).length,
        entries: navEntries.map(entry => ({
          name: entry.name,
          duration: entry.duration,
          startTime: entry.startTime,
        })),
      }
    } catch (error) {
      console.error('Error getting performance metrics:', error)
      return null
    }
  }, [hasPerformanceAPI])

  return {
    markNavigationStart,
    markNavigationEnd,
    measureOperation,
    getPerformanceMetrics,
    hasPerformanceAPI,
  }
}
