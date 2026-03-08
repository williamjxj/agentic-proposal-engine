/**
 * Markdown Viewer Component
 * 
 * Renders markdown content using react-markdown with GitHub-style flavors 
 * and Tailwind Typography (prose) styling.
 */

'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownViewerProps {
  content: string
  className?: string
}

export function MarkdownViewer({ content, className }: MarkdownViewerProps) {
  if (!content) return null

  return (
    <div className={cn('prose dark:prose-invert max-w-none', className)}>
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          // Optional: Add custom styling for components if needed
          h1: ({ children }) => <h1 className="text-2xl font-bold mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-6">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold mb-2 mt-4">{children}</h3>,
          p: ({ children }) => <p className="mb-4 text-sm leading-relaxed text-muted-foreground">{children}</p>,
          li: ({ children }) => <li className="text-sm text-muted-foreground">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          code: ({ children }) => <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
