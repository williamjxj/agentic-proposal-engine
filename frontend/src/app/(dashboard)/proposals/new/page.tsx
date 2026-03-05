/**
 * New Proposal Page
 * 
 * Create new proposals with auto-save and draft recovery.
 * Demonstrates full auto-save workflow implementation.
 * Supports pre-filling from job discovery results.
 */

'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
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

interface JobContext {
  id: string
  title: string
  company: string
  description: string
  platform: string
  skills?: string
  budget?: string
}

export default function NewProposalPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState<ProposalFormData>({
    title: '',
    description: '',
    budget: '',
    timeline: '',
    skills: '',
  })
  const [isInitialized, setIsInitialized] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobContext, setJobContext] = useState<JobContext | null>(null)
  const [showJobContext, setShowJobContext] = useState(true)

  // Extract job data from query parameters
  useEffect(() => {
    const jobId = searchParams.get('jobId')
    const jobTitle = searchParams.get('jobTitle')
    const jobCompany = searchParams.get('jobCompany')
    const jobDescription = searchParams.get('jobDescription')
    const jobPlatform = searchParams.get('jobPlatform')
    const jobSkills = searchParams.get('jobSkills')
    const jobBudget = searchParams.get('jobBudget')

    if (jobId && jobTitle) {
      // Set job context for reference
      setJobContext({
        id: jobId,
        title: jobTitle,
        company: jobCompany || 'Unknown Company',
        description: jobDescription || '',
        platform: jobPlatform || 'Unknown',
        skills: jobSkills || undefined,
        budget: jobBudget || undefined,
      })

      // Pre-fill form with job data
      setFormData((prev) => ({
        ...prev,
        title: `Proposal for: ${jobTitle}`,
        budget: jobBudget || prev.budget,
        skills: jobSkills || prev.skills,
        description: prev.description || `I am interested in your project "${jobTitle}". `,
      }))
    }
  }, [searchParams])

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
      const draftData = recoveredDraft.draftData
      if (draftData) {
        setFormData({
          title: draftData.title || '',
          description: draftData.description || '',
          budget: draftData.budget || '',
          timeline: draftData.timeline || '',
          skills: draftData.skills || '',
        })

        if (draftData.jobId) {
          setJobContext({
            id: draftData.jobId,
            title: draftData.jobTitle || '',
            company: draftData.jobCompany || 'Unknown Company',
            description: draftData.jobDescription || '',
            platform: draftData.jobPlatform || 'Unknown',
            skills: draftData.jobSkills,
            budget: draftData.jobBudget,
          })
        }
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
    data: {
      ...formData,
      jobId: jobContext?.id,
      jobTitle: jobContext?.title,
      jobCompany: jobContext?.company,
      jobDescription: jobContext?.description,
      jobPlatform: jobContext?.platform,
      jobSkills: jobContext?.skills,
      jobBudget: jobContext?.budget,
    },
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
    setIsSubmitting(true)
    setError(null)

    try {
      // Save current state first
      await saveNow()

      // Submit proposal from draft
      const { submitProposalFromDraft } = await import('@/lib/api/client')
      await submitProposalFromDraft('proposal', 'new')

      // Navigate to proposals list
      router.push('/proposals')
    } catch (error: any) {
      console.error('Failed to submit proposal:', error)
      setError(error.message || 'Failed to submit proposal. Please check if all required fields are filled correctly.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // AI-assisted proposal generation
  const handleAIGenerate = async () => {
    if (!jobContext) {
      alert('No job context available for AI generation')
      return
    }

    try {
      // TODO: Call backend API to generate proposal using RAG

      // Placeholder: Pre-fill with AI-style content
      setFormData((prev) => ({
        ...prev,
        description: prev.description +
          `\n\nBased on the job requirements for "${jobContext.title}", ` +
          `I am confident I can deliver exceptional results. My expertise in ${jobContext.skills || 'relevant technologies'} ` +
          `aligns perfectly with your needs.\n\n` +
          `I have successfully completed similar projects for ${jobContext.company} ` +
          `and understand the challenges in this domain. ` +
          `I can provide a detailed project plan and timeline upon request.`,
      }))
    } catch (error) {
      console.error('Failed to generate AI proposal:', error)
      alert('Failed to generate proposal. Please try again.')
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

      {/* Error Message */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          <p className="font-medium">Error submitting proposal</p>
          <p className="mt-1">{error}</p>
        </div>
      )}

      {/* Draft Recovery Banner */}
      {showRecoveryPrompt && (
        <DraftRecoveryBanner
          onRecover={recoverDraft}
          onDiscard={discardDraft}
          onDismiss={dismissPrompt}
        />
      )}

      {/* Job Context Card */}
      {jobContext && showJobContext && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="text-lg">💼</span>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Job Reference
              </h3>
            </div>
            <button
              onClick={() => setShowJobContext(false)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              title="Hide job context"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-sm">
            <div>
              <span className="font-medium text-blue-900 dark:text-blue-100">
                {jobContext.title}
              </span>
              <span className="text-blue-700 dark:text-blue-300 ml-2">
                • {jobContext.company}
              </span>
              <span className="text-blue-600 dark:text-blue-400 ml-2">
                • {jobContext.platform}
              </span>
            </div>

            {jobContext.description && (
              <p className="text-blue-800 dark:text-blue-200 line-clamp-2">
                {jobContext.description}
              </p>
            )}

            <div className="flex gap-4 text-blue-700 dark:text-blue-300">
              {jobContext.budget && (
                <span>💰 Budget: {jobContext.budget}</span>
              )}
              {jobContext.skills && (
                <span>🔧 Skills: {jobContext.skills}</span>
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-900">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 Tip: Your proposal will be tailored to this job using AI and your knowledge base
            </p>
          </div>
        </div>
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
          <div className="flex items-center justify-between mb-2">
            <label htmlFor="description" className="block text-sm font-medium">
              Description *
            </label>
            {jobContext && (
              <button
                type="button"
                onClick={handleAIGenerate}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                ✨ AI Generate
              </button>
            )}
          </div>
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
            disabled={isSubmitting || saveStatus === 'saving'}
            className="px-6 py-2 rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Proposal'}
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
        <p className="font-medium mb-2">💡 Tips for creating great proposals</p>
        <ul className="space-y-1 list-disc list-inside">
          <li>Auto-save is enabled - your work is saved automatically every 300ms</li>
          <li>A checkpoint is created every 10 seconds for recovery</li>
          <li>Drafts are kept for 24 hours and can be recovered later</li>
          {jobContext && (
            <>
              <li className="text-primary font-medium">
                ✨ Use "AI Generate" to get AI-powered content based on the job and your knowledge base
              </li>
              <li className="text-primary">
                The AI will analyze the job requirements and match them with your portfolio
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  )
}
