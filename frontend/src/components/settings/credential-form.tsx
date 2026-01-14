/**
 * Credential Form Component
 * 
 * Form for creating and editing platform credentials.
 */

'use client'

import { useState, useEffect } from 'react'
import { useCredentials, useUpsertCredential } from '@/hooks/useSettings'
import type { CredentialUpsert, PlatformPlatform } from '@/types/settings'

interface CredentialFormProps {
  credentialId: string | null
  onClose: () => void
  onSuccess: () => void
}

export function CredentialForm({ credentialId, onClose, onSuccess }: CredentialFormProps) {
  const isEditing = !!credentialId
  const { data: credentials = [] } = useCredentials()
  const credential = credentials.find(c => c.id === credentialId)
  const upsertMutation = useUpsertCredential()

  const [formData, setFormData] = useState<CredentialUpsert>({
    id: null,
    platform: 'upwork',
    api_key: '',
    api_secret: '',
    is_active: true,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load credential data when editing
  useEffect(() => {
    if (credential) {
      setFormData({
        id: credential.id,
        platform: credential.platform,
        api_key: credential.api_key,
        api_secret: credential.api_secret || '',
        is_active: credential.is_active,
      })
    }
  }, [credential])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.api_key.trim()) {
      newErrors.api_key = 'API key is required'
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
      await upsertMutation.mutateAsync(formData)
      onSuccess()
    } catch (error: any) {
      console.error('Error saving credential:', error)
      setErrors({ submit: error.message || 'Failed to save credential' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-lg rounded-lg border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Edit Credential' : 'Add Credential'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="platform" className="block text-sm font-medium mb-1">
              Platform
            </label>
            <select
              id="platform"
              value={formData.platform}
              onChange={(e) => setFormData({ ...formData, platform: e.target.value as PlatformPlatform })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              disabled={isEditing}
            >
              <option value="upwork">Upwork</option>
              <option value="freelancer">Freelancer</option>
              <option value="fiverr">Fiverr</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div>
            <label htmlFor="api_key" className="block text-sm font-medium mb-1">
              API Key <span className="text-red-500">*</span>
            </label>
            <input
              id="api_key"
              type="password"
              value={formData.api_key}
              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-900"
              placeholder="Enter API key"
            />
            {errors.api_key && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.api_key}</p>
            )}
          </div>

          <div>
            <label htmlFor="api_secret" className="block text-sm font-medium mb-1">
              API Secret (optional)
            </label>
            <input
              id="api_secret"
              type="password"
              value={formData.api_secret || ''}
              onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-900"
              placeholder="Enter API secret (if required)"
            />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <input
                id="is_active"
                type="checkbox"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="is_active" className="text-sm">
                Active
              </label>
            </div>
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
              disabled={upsertMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {upsertMutation.isPending ? 'Saving...' : isEditing ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
