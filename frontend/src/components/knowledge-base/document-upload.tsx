/**
 * Document Upload Component
 * 
 * Handles file upload for knowledge base documents.
 */

'use client'

import { useState, useRef } from 'react'
import { useUploadDocument } from '@/hooks/useKnowledgeBase'
import { Loader2 } from 'lucide-react'
import type { DocumentCollection } from '@/types/knowledge-base'

interface DocumentUploadProps {
  onSuccess: () => void
  onClose: () => void
}

export function DocumentUpload({ onSuccess, onClose }: DocumentUploadProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [collection, setCollection] = useState<DocumentCollection>('case_studies')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const uploadMutation = useUploadDocument()

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (!['pdf', 'doc', 'docx', 'txt'].includes(ext || '')) {
      setErrors({ file: 'Only PDF, DOCX, and TXT files are supported' })
      return
    }

    // Validate file size (50MB max)
    if (file.size > 50 * 1024 * 1024) {
      setErrors({ file: 'File size must be less than 50MB' })
      return
    }

    setSelectedFile(file)
    setErrors({})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      setErrors({ file: 'Please select a file' })
      return
    }

    if (!collection) {
      setErrors({ collection: 'Please select a collection' })
      return
    }

    try {
      await uploadMutation.mutateAsync({
        file: selectedFile,
        collection,
      })
      onSuccess()
    } catch (error: any) {
      console.error('Error uploading document:', error)
      setErrors({ submit: error.message || 'Failed to upload document' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-4 sm:p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900 max-h-[90vh] overflow-y-auto my-auto">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Upload Document</h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="file" className="block text-sm font-medium mb-1">
              File <span className="text-red-500">*</span>
            </label>
            <input
              ref={fileInputRef}
              id="file"
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileSelect}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            {selectedFile && (
              <p className="mt-1 text-sm text-muted-foreground">
                Selected: {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
            {errors.file && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.file}</p>
            )}
          </div>

          <div>
            <label htmlFor="collection" className="block text-sm font-medium mb-1">
              Collection <span className="text-red-500">*</span>
            </label>
            <select
              id="collection"
              value={collection}
              onChange={(e) => setCollection(e.target.value as DocumentCollection)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="case_studies">Case Studies</option>
              <option value="team_profiles">Team Profiles</option>
              <option value="portfolio">Portfolio</option>
              <option value="other">Other</option>
            </select>
            {errors.collection && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.collection}</p>
            )}
          </div>

          {errors.submit && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
              {errors.submit}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploadMutation.isPending || !selectedFile}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 min-w-[100px]"
            >
              {uploadMutation.isPending ? (
                <span className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </span>
              ) : (
                'Upload'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
