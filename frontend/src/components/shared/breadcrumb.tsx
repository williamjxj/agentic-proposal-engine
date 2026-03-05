/**
 * Breadcrumb - Context indicator for multi-step flows
 * Shows navigation path (e.g. Proposals > New Proposal)
 */

import Link from 'next/link'

export interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  if (items.length === 0) return null

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-2">
          {item.href ? (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
          {i < items.length - 1 && (
            <span className="text-muted-foreground/60">/</span>
          )}
        </span>
      ))}
    </nav>
  )
}
