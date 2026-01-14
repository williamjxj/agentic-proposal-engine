/**
 * Keyword Form Component
 * 
 * Form for creating and editing keywords.
 */

'use client'

import { useState, useEffect } from 'react'
import { useKeyword, useCreateKeyword, useUpdateKeyword } from '@/hooks/useKeywords'
import type { KeywordCreate, KeywordUpdate, MatchType } from '@/types/keywords'

interface KeywordFormProps {
  keywordId: string | null
  onClose: () => void
  onSuccess: () => void
}

export function KeywordForm({ keywordId, onClose, onSuccess }: KeywordFormProps) {
  const isEditing = !!keywordId
  const { data: keyword } = useKeyword(keywordId)
  const createMutation = useCreateKeyword()
  const updateMutation = useUpdateKeyword()

  const [formData, setFormData] = useState<KeywordCreate>({
    keyword: '',
    description: '',
    match_type: 'partial',
    is_active: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load keyword data when editing
  useEffect(() => {
    if (keyword) {
      setFormData({
        keyword: keyword.keyword,
        description: keyword.description || '',
        match_type: keyword.match_type,
        is_active: keyword.is_active,
      })
    }
  }, [keyword])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.keyword.trim()) {
      newErrors.keyword = 'Keyword is required'
    } else if (formData.keyword.length > 255) {
      newErrors.keyword = 'Keyword must be 255 characters or less'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    try {
      if (isEditing && keywordId) {
        const updateData: KeywordUpdate = {
          keyword: formData.keyword,
          description: formData.description || null,
          match_type: formData.match_type,
          is_active: formData.is_active,
        }
        await updateMutation.mutateAsync({ id: keywordId, data: updateData })
      } else {
        await createMutation.mutateAsync(formData)
      }
      onSuccess()
    } catch (error: any) {
      console.error('Error saving keyword:', error)
      setErrors({ submit: error.message || 'Failed to save keyword' })
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      role="dialog"
      aria-modal="true"
      aria-labelledby="keyword-form-title"
    >
      <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 id="keyword-form-title" className="text-xl font-semibold">
            {isEditing ? 'Edit Keyword' : 'Create Keyword'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
            aria-label="Close dialog"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="keyword" className="block text-sm font-medium mb-1">
              Keyword <span className="text-red-500" aria-label="required">*</span>
            </label>
            <input
              id="keyword"
              type="text"
              value={formData.keyword}
              onChange={(e) => setFormData({ ...formData, keyword: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              placeholder="e.g., React, Python, Design"
              maxLength={255}
              aria-required="true"
              aria-invalid={!!errors.keyword}
              aria-describedby={errors.keyword ? 'keyword-error' : undefined}
            />
            {errors.keyword && (
              <p id="keyword-error" className="mt-1 text-sm text-red-600 dark:text-red-400" role="alert">
                {errors.keyword}
              </p>
            )}
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium mb-1">
              Description (optional)
            </label>
            <textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              placeholder="Optional description for this keyword"
              rows={3}
            />
          </div>

          <div>
            <label htmlFor="match_type" className="block text-sm font-medium mb-1">
              Match Type
            </label>
            <select
              id="match_type"
              value={formData.match_type}
              onChange={(e) => setFormData({ ...formData, match_type: e.target.value as MatchType })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="exact">Exact Match</option>
              <option value="partial">Partial Match</option>
              <option value="fuzzy">Fuzzy Match</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              id="is_active"
              type="checkbox"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
              className="h-4 w-4 rounded border-slate-300"
            />
            <label htmlFor="is_active" className="text-sm font-medium">
              Active (use this keyword for job matching)
            </label>
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
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : isEditing
                ? 'Update'
                : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
