/**
 * New Proposal Page
 * 
 * Create new proposals with auto-save and draft recovery.
 * Demonstrates full auto-save workflow implementation.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useDraftRecovery } from '@/hooks/useDraftRecovery'
import { AutoSaveIndicator, DraftRecoveryBanner } from '@/components/workflow/auto-save-indicator'
import { LoadingSkeleton } from '@/components/workflow/progress-overlay'

interface ProposalFormData {
  title: string
  description: string
  budget: string
  timeline: string
  skills: string
}

export default function NewProposalPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<ProposalFormData>({
    title: '',
    description: '',
    budget: '',
    timeline: '',
    skills: '',
  })
  const [isInitialized, setIsInitialized] = useState(false)

  // Draft recovery
  const {
    showRecoveryPrompt,
    draft,
    recoverDraft,
    discardDraft,
    dismissPrompt,
  } = useDraftRecovery({
    entityType: 'proposal',
    entityId: null, // null for new proposals
    onRecover: (recoveredDraft) => {
      // Restore form data from draft
      if (recoveredDraft.draft_data) {
        setFormData(recoveredDraft.draft_data as ProposalFormData)
      }
    },
    onDiscard: () => {
      // Start with fresh form
      setFormData({
        title: '',
        description: '',
        budget: '',
        timeline: '',
        skills: '',
      })
    },
  })

  // Auto-save
  const {
    status: saveStatus,
    lastSaved,
    error: saveError,
    hasUnsavedChanges,
    saveNow,
    currentVersion,
  } = useAutoSave({
    entityType: 'proposal',
    entityId: null,
    data: formData,
    enabled: isInitialized && !showRecoveryPrompt,
    onSaveSuccess: (draft) => {
      console.log('Draft saved successfully:', draft)
    },
    onSaveError: (error) => {
      console.error('Draft save failed:', error)
    },
  })

  // Mark as initialized after mount
  useEffect(() => {
    setIsInitialized(true)
  }, [])

  // Handle form changes
  const handleChange = (field: keyof ProposalFormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    try {
      // Save current state first
      await saveNow()

      // Submit proposal from draft
      const { submitProposalFromDraft } = await import('@/lib/api/client')
      await submitProposalFromDraft('proposal', 'new')

      // Navigate to proposals list
      router.push('/proposals')
    } catch (error) {
      console.error('Failed to submit proposal:', error)
      // TODO: Show error message to user
    }
  }

  if (!isInitialized) {
    return (
      <div className="space-y-4">
        <h1 className="text-3xl font-bold">New Proposal</h1>
        <LoadingSkeleton lines={5} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Auto-Save Indicator */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">New Proposal</h1>
        
        <AutoSaveIndicator
          status={saveStatus}
          lastSaved={lastSaved}
          error={saveError}
          hasUnsavedChanges={hasUnsavedChanges}
          onManualSave={saveNow}
        />
      </div>

      {/* Draft Recovery Banner */}
      {showRecoveryPrompt && (
        <DraftRecoveryBanner
          onRecover={recoverDraft}
          onDiscard={discardDraft}
          onDismiss={dismissPrompt}
        />
      )}

      {/* Proposal Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium mb-2">
            Proposal Title *
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            required
            placeholder="Enter a compelling title for your proposal"
            className="w-full rounded-md border border-slate-300 px-4 py-2 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium mb-2">
            Description *
          </label>
          <textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            required
            rows={8}
            placeholder="Describe your approach, methodology, and what makes your proposal unique"
            className="w-full rounded-md border border-slate-300 px-4 py-2 dark:border-slate-700 dark:bg-slate-900"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Minimum 100 characters (currently: {formData.description.length})
          </p>
        </div>

        {/* Budget & Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="budget" className="block text-sm font-medium mb-2">
              Budget *
            </label>
            <input
              type="text"
              id="budget"
              value={formData.budget}
              onChange={(e) => handleChange('budget', e.target.value)}
              required
              placeholder="e.g., $5,000 - $10,000"
              className="w-full rounded-md border border-slate-300 px-4 py-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>

          <div>
            <label htmlFor="timeline" className="block text-sm font-medium mb-2">
              Timeline *
            </label>
            <input
              type="text"
              id="timeline"
              value={formData.timeline}
              onChange={(e) => handleChange('timeline', e.target.value)}
              required
              placeholder="e.g., 4-6 weeks"
              className="w-full rounded-md border border-slate-300 px-4 py-2 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
        </div>

        {/* Skills */}
        <div>
          <label htmlFor="skills" className="block text-sm font-medium mb-2">
            Required Skills
          </label>
          <input
            type="text"
            id="skills"
            value={formData.skills}
            onChange={(e) => handleChange('skills', e.target.value)}
            placeholder="e.g., React, TypeScript, Node.js (comma-separated)"
            className="w-full rounded-md border border-slate-300 px-4 py-2 dark:border-slate-700 dark:bg-slate-900"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <button
            type="submit"
            disabled={saveStatus === 'saving'}
            className="px-6 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Proposal
          </button>

          <button
            type="button"
            onClick={() => router.push('/proposals')}
            className="px-6 py-2 rounded-md border border-slate-300 text-slate-700 font-medium hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Cancel
          </button>

          {/* Save Status Info */}
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span>Version {currentVersion}</span>
            {hasUnsavedChanges && <span>• Unsaved</span>}
          </div>
        </div>
      </form>

      {/* Help Text */}
      <div className="rounded-lg border border-slate-200 p-4 text-sm text-muted-foreground dark:border-slate-800">
        <p className="font-medium mb-2">💡 Auto-Save is enabled</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Your work is automatically saved as you type (after 300ms)</li>
          <li>A checkpoint is created every 10 seconds</li>
          <li>Drafts are kept for 24 hours</li>
          <li>You can recover drafts if you leave and come back</li>
        </ul>
      </div>
    </div>
  )
}
