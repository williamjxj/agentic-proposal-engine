/**
 * Dashboard Layout - Protected Routes Layout
 * Wraps all dashboard pages with sidebar, header, and workflow context
 */

import { AppSidebar } from '@/components/shared/app-sidebar'
import { TopHeader } from '@/components/shared/top-header'
import { PageTransition } from '@/components/shared/page-transition'
import { WorkflowProvider } from '@/lib/workflow/session-context'
import { BrowserNavigationHandler } from '@/components/workflow/browser-navigation-handler'
import { ToastProvider } from '@/lib/toast/toast-context'
import { SidebarProvider } from '@/lib/sidebar/sidebar-context'

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <WorkflowProvider>
      <ToastProvider>
        <SidebarProvider>
        <BrowserNavigationHandler />
        <div className="flex min-h-screen">
        <AppSidebar />
        <div className="flex flex-1 flex-col">
          <TopHeader />
          <main className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 dark:bg-slate-950">
            <PageTransition>{children}</PageTransition>
          </main>
        </div>
      </div>
        </SidebarProvider>
      </ToastProvider>
    </WorkflowProvider>
  )
}
