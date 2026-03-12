/**
 * Strategy Form Component
 *
 * Form for creating and editing strategies.
 */

'use client'

import { useState, useEffect } from 'react'
import { X, Save, Plus, Trash2 } from 'lucide-react'
import { useStrategy, useCreateStrategy, useUpdateStrategy } from '@/hooks/useStrategies'
import type { StrategyCreate, StrategyUpdate, StrategyTone } from '@/types/strategies'

interface StrategyFormProps {
  strategyId: string | null
  onClose: () => void
  onSuccess: () => void
}

export function StrategyForm({ strategyId, onClose, onSuccess }: StrategyFormProps) {
  const isEditing = !!strategyId
  const { data: strategy } = useStrategy(strategyId)
  const createMutation = useCreateStrategy()
  const updateMutation = useUpdateStrategy()

  const [formData, setFormData] = useState<StrategyCreate>({
    name: '',
    description: '',
    system_prompt: '',
    tone: 'professional',
    focus_areas: [],
    temperature: 0.7,
    max_tokens: 1500,
    is_default: false,
  })
  const [focusAreaInput, setFocusAreaInput] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})

  // Load strategy data when editing
  useEffect(() => {
    if (strategy) {
      setFormData({
        name: strategy.name,
        description: strategy.description || '',
        system_prompt: strategy.system_prompt,
        tone: strategy.tone,
        focus_areas: strategy.focus_areas,
        temperature: strategy.temperature,
        max_tokens: strategy.max_tokens,
        is_default: strategy.is_default,
      })
    }
  }, [strategy])

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Name is required'
    } else if (formData.name.length > 255) {
      newErrors.name = 'Name must be 255 characters or less'
    }

    if (!formData.system_prompt.trim()) {
      newErrors.system_prompt = 'System prompt is required'
    }

    const temperature = formData.temperature ?? 0.7
    if (temperature < 0 || temperature > 2) {
      newErrors.temperature = 'Temperature must be between 0 and 2'
    }

    const max_tokens = formData.max_tokens ?? 1500
    if (max_tokens < 100 || max_tokens > 4000) {
      newErrors.max_tokens = 'Max tokens must be between 100 and 4000'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddFocusArea = () => {
    const input = focusAreaInput.trim()
    if (!input) return

    // Support comma-separated input
    const newAreas = input
      .split(',')
      .map((a) => a.trim())
      .filter((a) => a && !formData.focus_areas?.includes(a))

    if (newAreas.length > 0) {
      setFormData({
        ...formData,
        focus_areas: [...(formData.focus_areas || []), ...newAreas],
      })
    }
    setFocusAreaInput('')
  }

  const handleRemoveFocusArea = (area: string) => {
    setFormData({
      ...formData,
      focus_areas: formData.focus_areas?.filter((a) => a !== area) || [],
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Auto-add any pending focus area input
    let finalFocusAreas = formData.focus_areas || []
    if (focusAreaInput.trim()) {
      const pendingAreas = focusAreaInput
        .split(',')
        .map((a) => a.trim())
        .filter((a) => a && !finalFocusAreas.includes(a))
      finalFocusAreas = [...finalFocusAreas, ...pendingAreas]
    }

    if (!validate()) {
      return
    }

    try {
      if (isEditing && strategyId) {
        const updateData: StrategyUpdate = {
          name: formData.name,
          description: formData.description || null,
          system_prompt: formData.system_prompt,
          tone: formData.tone,
          focus_areas: finalFocusAreas,
          temperature: formData.temperature,
          max_tokens: formData.max_tokens,
        }
        await updateMutation.mutateAsync({ id: strategyId, data: updateData })
      } else {
        await createMutation.mutateAsync({
          ...formData,
          focus_areas: finalFocusAreas,
        })
      }
      onSuccess()
    } catch (error: any) {
      console.error('Error saving strategy:', error)
      setErrors({ submit: error.message || 'Failed to save strategy' })
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-6 shadow-lg dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isEditing ? 'Edit Strategy' : 'Create Strategy'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground rounded-md p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
            title="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium mb-1">
              Name <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              placeholder="e.g., Professional Technical, Friendly Casual"
              maxLength={255}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
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
              placeholder="Optional description for this strategy"
              rows={2}
            />
          </div>

          <div>
            <label htmlFor="system_prompt" className="block text-sm font-medium mb-1">
              System Prompt <span className="text-red-500">*</span>
            </label>
            <textarea
              id="system_prompt"
              value={formData.system_prompt}
              onChange={(e) => setFormData({ ...formData, system_prompt: e.target.value })}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm font-mono dark:border-slate-700 dark:bg-slate-900"
              placeholder="Enter the system prompt that defines how proposals are generated..."
              rows={8}
            />
            {errors.system_prompt && (
              <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.system_prompt}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="tone" className="block text-sm font-medium mb-1">
                Tone
              </label>
              <select
                id="tone"
                value={formData.tone}
                onChange={(e) => setFormData({ ...formData, tone: e.target.value as StrategyTone })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              >
                <option value="professional">Professional</option>
                <option value="enthusiastic">Enthusiastic</option>
                <option value="technical">Technical</option>
                <option value="friendly">Friendly</option>
                <option value="formal">Formal</option>
              </select>
            </div>

            <div>
              <label htmlFor="is_default" className="block text-sm font-medium mb-1">
                Default Strategy
              </label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  id="is_default"
                  type="checkbox"
                  checked={formData.is_default}
                  onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                  className="h-4 w-4 rounded border-slate-300"
                />
                <label htmlFor="is_default" className="text-sm">
                  Set as default strategy
                </label>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="temperature" className="block text-sm font-medium mb-1">
                Temperature (0-2)
              </label>
              <input
                id="temperature"
                type="number"
                min="0"
                max="2"
                step="0.1"
                value={formData.temperature}
                onChange={(e) => setFormData({ ...formData, temperature: parseFloat(e.target.value) || 0.7 })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              {errors.temperature && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.temperature}</p>
              )}
            </div>

            <div>
              <label htmlFor="max_tokens" className="block text-sm font-medium mb-1">
                Max Tokens (100-4000)
              </label>
              <input
                id="max_tokens"
                type="number"
                min="100"
                max="4000"
                value={formData.max_tokens}
                onChange={(e) => setFormData({ ...formData, max_tokens: parseInt(e.target.value) || 1500 })}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
              />
              {errors.max_tokens && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.max_tokens}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="focus_areas" className="block text-sm font-medium mb-1">
              Focus Areas
            </label>
            <div className="flex gap-2 mb-2">
              <input
                id="focus_areas"
                type="text"
                value={focusAreaInput}
                onChange={(e) => setFocusAreaInput(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleAddFocusArea()
                  }
                }}
                className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
                placeholder="Add focus area and press Enter"
              />
              <button
                type="button"
                onClick={handleAddFocusArea}
                className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 flex items-center gap-1.5"
                title="Add focus area"
              >
                <Plus className="h-4 w-4" />
                Add
              </button>
            </div>
            {formData.focus_areas && formData.focus_areas.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.focus_areas.map((area, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
                  >
                    {area}
                    <button
                      type="button"
                      onClick={() => handleRemoveFocusArea(area)}
                      className="hover:text-blue-600"
                      title="Remove"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
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
              disabled={createMutation.isPending || updateMutation.isPending}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="h-4 w-4" />
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
