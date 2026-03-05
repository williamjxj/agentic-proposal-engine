/**
 * PageContainer - Consistent page layout wrapper
 * Provides spacing and max-width for dashboard page content.
 */

import * as React from 'react'

interface PageContainerProps
  extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export const PageContainer = React.forwardRef<
  HTMLDivElement,
  PageContainerProps
>(function PageContainer({ children, className, ...props }, ref) {
  return (
    <div
      ref={ref}
      className={className ?? 'space-y-6'}
      {...props}
    >
      {children}
    </div>
  )
})
