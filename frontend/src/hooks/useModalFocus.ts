/**
 * useModalFocus Hook
 * 
 * Manages focus trapping and restoration for modal dialogs.
 */

import { useEffect, useRef } from 'react'

interface UseModalFocusOptions {
  isOpen: boolean
  initialFocusRef?: React.RefObject<HTMLElement>
  returnFocusRef?: React.RefObject<HTMLElement>
}

export function useModalFocus({
  isOpen,
  initialFocusRef,
  returnFocusRef,
}: UseModalFocusOptions) {
  const previousActiveElement = useRef<HTMLElement | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    // Save the currently focused element
    previousActiveElement.current = document.activeElement as HTMLElement

    // Focus the initial element or the container
    if (initialFocusRef?.current) {
      initialFocusRef.current.focus()
    } else if (containerRef.current) {
      const firstFocusable = containerRef.current.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      firstFocusable?.focus()
    }

    // Trap focus within the modal
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab' || !containerRef.current) return

      const focusableElements = containerRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )

      if (focusableElements.length === 0) return

      const firstElement = focusableElements[0]
      const lastElement = focusableElements[focusableElements.length - 1]

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault()
          lastElement.focus()
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault()
          firstElement.focus()
        }
      }
    }

    // Handle Escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && containerRef.current) {
        // Let the parent component handle closing
        // This just ensures focus is managed
      }
    }

    document.addEventListener('keydown', handleTabKey)
    document.addEventListener('keydown', handleEscape)

    return () => {
      document.removeEventListener('keydown', handleTabKey)
      document.removeEventListener('keydown', handleEscape)

      // Restore focus to the previous element
      if (returnFocusRef?.current) {
        returnFocusRef.current.focus()
      } else if (previousActiveElement.current) {
        previousActiveElement.current.focus()
      }
    }
  }, [isOpen, initialFocusRef, returnFocusRef])

  return containerRef
}
