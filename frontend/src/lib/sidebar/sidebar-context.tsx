/**
 * Sidebar Context - Mobile menu state
 * Allows TopHeader to trigger mobile sidebar and AppSidebar to render it
 */

'use client'

import {
  createContext,
  useCallback,
  useContext,
  useState,
  type ReactNode,
} from 'react'

interface SidebarContextValue {
  mobileOpen: boolean
  openMobile: () => void
  closeMobile: () => void
  toggleMobile: () => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

const fallback: SidebarContextValue = {
  mobileOpen: false,
  openMobile: () => {},
  closeMobile: () => {},
  toggleMobile: () => {},
}

export function useSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext)
  return ctx ?? fallback
}

export function SidebarProvider({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const openMobile = useCallback(() => setMobileOpen(true), [])
  const closeMobile = useCallback(() => setMobileOpen(false), [])
  const toggleMobile = useCallback(() => setMobileOpen((v) => !v), [])

  const value: SidebarContextValue = {
    mobileOpen,
    openMobile,
    closeMobile,
    toggleMobile,
  }

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  )
}
