/**
 * Preferences Form Component
 *
 * Form for updating user preferences.
 */

'use client'

import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { useSettings, useUpdatePreferences } from '@/hooks/useSettings'
import type { UserPreferences } from '@/types/settings'

export function PreferencesForm() {
  const { data: settings, isLoading } = useSettings()
  const updateMutation = useUpdatePreferences()

  const [formData, setFormData] = useState<UserPreferences>({
    theme: 'light',
    notification_email: true,
    notification_browser: true,
    language: 'en',
    default_strategy_id: null,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load settings when available
  useEffect(() => {
    if (settings?.preferences) {
      setFormData({
        theme: settings.preferences.theme ?? 'light',
        notification_email: settings.preferences.notification_email ?? true,
        notification_browser: settings.preferences.notification_browser ?? true,
        language: settings.preferences.language ?? 'en',
        default_strategy_id: settings.preferences.default_strategy_id ?? null,
      })
    }
  }, [settings])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      await updateMutation.mutateAsync(formData)
    } catch (error: any) {
      console.error('Error updating preferences:', error)
      setErrors({ submit: error.message || 'Failed to update preferences' })
    }
  }

  if (isLoading) {
    return <div className="text-muted-foreground">Loading preferences...</div>
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Preferences</h3>

        <div className="space-y-4">
          <div>
            <label htmlFor="theme" className="block text-sm font-medium mb-1">
              Theme
            </label>
            <select
              id="theme"
              value={formData.theme}
              onChange={(e) => setFormData({ ...formData, theme: e.target.value as 'light' | 'dark' | 'system' })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
              <option value="system">System</option>
            </select>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <input
                id="notification_browser"
                type="checkbox"
                checked={formData.notification_browser}
                onChange={(e) => setFormData({ ...formData, notification_browser: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="notification_browser" className="text-sm font-medium">
                Browser notifications
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="notification_email"
                type="checkbox"
                checked={formData.notification_email}
                onChange={(e) => setFormData({ ...formData, notification_email: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="notification_email" className="text-sm font-medium">
                Email notifications
              </label>
            </div>
          </div>
        </div>
      </div>

      {errors.submit && (
        <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-200">
          {errors.submit}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={updateMutation.isPending}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
        >
          <Save className="h-4 w-4" />
          {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </form>
  )
}
