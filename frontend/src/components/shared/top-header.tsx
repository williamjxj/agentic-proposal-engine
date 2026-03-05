/**
 * TopHeader Component - Dashboard Header
 * Displays user menu and notifications
 */

'use client'

import { useAuth } from '@/hooks/useAuth'
import { useSidebar } from '@/lib/sidebar/sidebar-context'
import { getInitials } from '@/lib/utils'
import { ThemeSwitcher } from './theme-switcher'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-react'

export function TopHeader() {
  const { user, signOut } = useAuth()
  const { openMobile } = useSidebar()

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          onClick={openMobile}
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>
        <h2 className="text-lg font-semibold">Welcome back!</h2>
      </div>

      <div className="flex items-center gap-4">
        <ThemeSwitcher />
        {user && (
          <>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground">
                {getInitials(user.email || 'User')}
              </div>
              <div className="hidden sm:block">
                <p className="text-sm font-medium">{user.email}</p>
                <p className="text-xs text-muted-foreground">Free Plan</p>
              </div>
            </div>

            <button
              onClick={() => signOut()}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Sign out
            </button>
          </>
        )}
      </div>
    </header>
  )
}
