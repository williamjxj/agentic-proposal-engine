/**
 * useReduceMotion - Respect prefers-reduced-motion user preference
 * Returns true when user prefers reduced motion (accessibility)
 */

'use client'

import { useState, useEffect } from 'react'

export function useReduceMotion(): boolean {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mediaQuery.matches)

    const handler = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches)
    }
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return prefersReducedMotion
}
