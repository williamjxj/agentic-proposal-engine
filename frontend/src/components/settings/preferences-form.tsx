/**
 * Preferences Form Component
 * 
 * Form for updating user preferences.
 */

'use client'

import { useState, useEffect } from 'react'
import { useSettings, useUpdatePreferences } from '@/hooks/useSettings'
import type { UserPreferences } from '@/types/settings'

export function PreferencesForm() {
  const { data: settings, isLoading } = useSettings()
  const updateMutation = useUpdatePreferences()

  const [formData, setFormData] = useState<UserPreferences>({
    theme: 'light',
    notifications_enabled: true,
    email_notifications: true,
    default_strategy_id: null,
  })
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load settings when available
  useEffect(() => {
    if (settings?.preferences) {
      setFormData(settings.preferences)
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
                id="notifications_enabled"
                type="checkbox"
                checked={formData.notifications_enabled}
                onChange={(e) => setFormData({ ...formData, notifications_enabled: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
              />
              <label htmlFor="notifications_enabled" className="text-sm font-medium">
                Enable notifications
              </label>
            </div>

            <div className="flex items-center gap-2">
              <input
                id="email_notifications"
                type="checkbox"
                checked={formData.email_notifications}
                onChange={(e) => setFormData({ ...formData, email_notifications: e.target.checked })}
                className="h-4 w-4 rounded border-slate-300"
                disabled={!formData.notifications_enabled}
              />
              <label htmlFor="email_notifications" className="text-sm font-medium">
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
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {updateMutation.isPending ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>
    </form>
  )
}
