/**
 * AppSidebar Component - Navigation Sidebar
 * Provides navigation links for dashboard sections with session state integration
 */

'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useSessionState } from '@/hooks/useSessionState'
import { useSidebar } from '@/lib/sidebar/sidebar-context'
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Wifi, WifiOff } from 'lucide-react'

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: '📊' },
  { name: 'Projects', href: '/projects', icon: '💼' },
  { name: 'Proposals', href: '/proposals', icon: '📝' },
  { name: 'Knowledge Base', href: '/knowledge-base', icon: '📚' },
  { name: 'Strategies', href: '/strategies', icon: '🎯' },
  { name: 'Keywords', href: '/keywords', icon: '🔑' },
  { name: 'Analytics', href: '/analytics', icon: '📈' },
  { name: 'Settings', href: '/settings', icon: '⚙️' },
]

export function AppSidebar() {
  const pathname = usePathname()
  const { isOnline, canGoBack, goBack } = useSessionState()
  const { mobileOpen, closeMobile } = useSidebar()

  // Session state is updated by route-tracking effect in WorkflowProvider when pathname changes.
  // Don't call updateNavigation here - it caused duplicate API calls (sidebar click + effect both firing).

  const navLinks = (
    <>
      {canGoBack && (
        <button
          onClick={goBack}
          className="mb-2 flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
        >
          <span>←</span>
          <span>Back</span>
        </button>
      )}
      {navigation.map((item) => {
        const isActive =
          pathname === item.href || pathname.startsWith(item.href + '/')
        return (
          <Link
            key={item.name}
            href={item.href}
            onClick={() => closeMobile()}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
              isActive
                ? 'bg-primary text-primary-foreground ring-2 ring-primary/30 ring-offset-2 ring-offset-background shadow-sm'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <span className="text-lg">{item.icon}</span>
            <span>{item.name}</span>
          </Link>
        )
      })}
    </>
  )

  return (
    <>
    {/* Desktop sidebar - hidden on mobile */}
    <aside className="hidden md:flex w-64 flex-shrink-0 flex-col border-r bg-card">
      <div className="flex h-16 items-center justify-between border-b px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image
            src="/logo-compact.svg"
            alt="Auto Bidder"
            width={140}
            height={35}
            className="h-8 w-auto"
            priority
          />
        </Link>

        {/* Online/offline indicator */}
        <div className="flex items-center gap-1" title={isOnline ? 'Online' : 'Offline'}>
          {isOnline ? (
            <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
          ) : (
            <WifiOff className="h-4 w-4 text-red-600 dark:text-red-400" />
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-4">
        {navLinks}
      </nav>

      <div className="border-t p-4 space-y-2">
        <p className="text-xs text-muted-foreground">
          v0.1.9 - Beta
          {!isOnline && (
            <span className="ml-2 text-xs text-red-600 dark:text-red-400">
              (Offline)
            </span>
          )}
        </p>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <span>© 2025-2026</span>
          <a
            href="https://www.bestitconsulting.ca"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:opacity-80 transition-opacity"
          >
            <span>Powered by</span>
            <Image
              src="/b11-logo.png"
              alt="Best IT Consulting"
              width={60}
              height={16}
              className="h-4 w-auto"
            />
          </a>
        </div>
      </div>
    </aside>

    {/* Mobile sidebar sheet */}
    <Sheet open={mobileOpen} onOpenChange={(open) => !open && closeMobile()}>
      <SheetContent side="left" className="w-72 p-0">
        <SheetTitle className="sr-only">Navigation menu</SheetTitle>
        <div className="flex h-full flex-col pt-16">
          <div className="flex h-14 items-center border-b px-4">
            <Link href="/dashboard" onClick={closeMobile} className="flex items-center gap-2">
              <Image
                src="/logo-compact.svg"
                alt="Auto Bidder"
                width={120}
                height={30}
                className="h-7 w-auto"
              />
            </Link>
          </div>
          <nav className="flex-1 space-y-1 p-4">
            {navLinks}
          </nav>
          <div className="border-t p-4 space-y-2">
            <p className="text-xs text-muted-foreground">v0.1.9 - Beta</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>© 2025-2026</span>
              <a
                href="https://www.bestitconsulting.ca"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 hover:opacity-80 transition-opacity"
              >
                <span>Powered by</span>
                <Image
                  src="/b11-logo.png"
                  alt="Best IT Consulting"
                  width={60}
                  height={16}
                  className="h-4 w-auto"
                />
              </a>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
    </>
  )
}
