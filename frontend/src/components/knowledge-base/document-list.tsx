/**
 * Document List Component
 * 
 * Displays a list of knowledge base documents with actions.
 */

'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Document } from '@/types/knowledge-base'

interface DocumentListProps {
  documents: Document[]
  onDelete: (documentId: string) => void
  onReprocess: (documentId: string) => void
}

export function DocumentList({ documents, onDelete, onReprocess }: DocumentListProps) {
  if (documents.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
        <p className="text-muted-foreground">No documents found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Upload your first document to build your knowledge base
        </p>
      </div>
    )
  }

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string }> = {
      pending: { label: 'Pending', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
      processing: { label: 'Processing', className: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
      completed: { label: 'Completed', className: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
      failed: { label: 'Failed', className: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
    }
    const statusInfo = statusMap[status] || statusMap.pending
    return (
      <span className={`rounded-full px-2 py-0.5 text-xs ${statusInfo.className}`}>
        {statusInfo.label}
      </span>
    )
  }

  return (
    <div className="grid gap-4">
      {documents.map((document) => (
        <Card key={document.id} className="transition-all hover:shadow-md hover:border-primary/50">
          <CardContent className="pt-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-semibold text-lg">{document.filename}</h3>
                {getStatusBadge(document.processing_status)}
                <Badge variant="secondary" className="capitalize">
                  {document.collection.replace('_', ' ')}
                </Badge>
              </div>
              <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
                <span>Type: {document.file_type.toUpperCase()}</span>
                <span>Size: {formatFileSize(document.file_size_bytes)}</span>
                {document.chunk_count > 0 && (
                  <>
                    <span>Chunks: {document.chunk_count}</span>
                    <span>Tokens: {document.chunk_count.toLocaleString()}</span>
                  </>
                )}
                {document.retrieval_count > 0 && (
                  <span>Retrieved: {document.retrieval_count} times</span>
                )}
              </div>
              {document.processing_error && (
                <div className="mt-2 rounded-md bg-red-50 p-2 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
                  Error: {document.processing_error}
                </div>
              )}
              {document.file_url && (
                <a
                  href={document.file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm text-blue-600 hover:underline dark:text-blue-400"
                >
                  Download file
                </a>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              {document.processing_status === 'completed' && (
                <Button variant="outline" size="sm" className="text-blue-600 border-blue-300 dark:text-blue-400" onClick={() => onReprocess(document.id)}>
                  Reprocess
                </Button>
              )}
              <Button variant="outline" size="sm" className="text-red-600 border-red-300 dark:text-red-400" onClick={() => onDelete(document.id)}>
                Delete
              </Button>
            </div>
          </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
