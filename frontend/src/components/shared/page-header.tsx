/**
 * PageHeader - Consistent page title and description
 * Used across dashboard pages for visual consistency.
 */

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({
  title,
  description,
  children,
}: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
        {description && (
          <p className="mt-2 text-muted-foreground">{description}</p>
        )}
      </div>
      {children && <div className="mt-4 sm:mt-0">{children}</div>}
    </div>
  )
}
