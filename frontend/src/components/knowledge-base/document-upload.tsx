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
  const [title, setTitle] = useState<string>('')
  const [collection, setCollection] = useState<DocumentCollection>('case_studies')
  const [supplementalInfo, setSupplementalInfo] = useState<string>('')
  const [referenceUrl, setReferenceUrl] = useState<string>('')
  const [email, setEmail] = useState<string>('')
  const [phone, setPhone] = useState<string>('')
  const [contactUrl, setContactUrl] = useState<string>('')
  const [isOptionalOpen, setIsOptionalOpen] = useState(false)
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

    // Auto-populate title from filename (remove extension)
    const fileNameWithoutExt = file.name.replace(/\.[^/.]+$/, '')
    setTitle(fileNameWithoutExt)

    setErrors({})
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedFile) {
      setErrors({ file: 'Please select a file' })
      return
    }

    if (!title.trim()) {
      setErrors({ title: 'Please enter a title' })
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
        options: {
          title: title.trim(),
          supplemental_info: supplementalInfo.trim() || undefined,
          reference_url: referenceUrl || undefined,
          email: email || undefined,
          phone: phone || undefined,
          contact_url: contactUrl || undefined,
        },
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
            <p className="mt-1 text-xs text-muted-foreground">
              Supported formats: PDF, DOCX, TXT (Max 50MB)
            </p>
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
            <label htmlFor="title" className="block text-sm font-medium mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              placeholder="Document title"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {title.length}/200 characters
            </p>
            {errors.title && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.title}</p>
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

          {/* Optional Fields Accordion */}
          <div className="border-t pt-4 dark:border-slate-700">
            <button
              type="button"
              onClick={() => setIsOptionalOpen(!isOptionalOpen)}
              className="flex w-full items-center justify-between text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <span>Optional: Contact, Reference & Supplemental Info</span>
              <span className="text-lg">{isOptionalOpen ? '▼' : '▶'}</span>
            </button>

            {isOptionalOpen && (
              <div className="mt-3 space-y-3">
                <div>
                  <label htmlFor="supplemental_info" className="block text-xs font-medium mb-1">
                    Supplemental Information
                  </label>
                  <textarea
                    id="supplemental_info"
                    value={supplementalInfo}
                    onChange={(e) => setSupplementalInfo(e.target.value)}
                    rows={4}
                    placeholder="Add context, notes, or platform-specific information that will be included in AI search..."
                    className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900 resize-none"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    This info will be embedded with the document for better AI retrieval
                  </p>
                </div>

                <div className="border-t pt-3 dark:border-slate-700">
                  <p className="text-xs font-medium mb-2 text-muted-foreground">Contact & Reference</p>

                  <div className="space-y-3">
                    <div>
                      <label htmlFor="reference_url" className="block text-xs font-medium mb-1">
                        Reference URL
                      </label>
                      <input
                        id="reference_url"
                        type="url"
                        value={referenceUrl}
                        onChange={(e) => setReferenceUrl(e.target.value)}
                        placeholder="https://company.com, github.com/user, etc."
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="email" className="block text-xs font-medium mb-1">
                        Email
                      </label>
                      <input
                        id="email"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="contact@example.com"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="phone" className="block text-xs font-medium mb-1">
                        Phone
                      </label>
                      <input
                        id="phone"
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+1 (555) 123-4567"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>

                    <div>
                      <label htmlFor="contact_url" className="block text-xs font-medium mb-1">
                        Contact URL (LinkedIn, etc.)
                      </label>
                      <input
                        id="contact_url"
                        type="url"
                        value={contactUrl}
                        onChange={(e) => setContactUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/username"
                        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                      />
                    </div>
                  </div>
                </div>
              </div>
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
