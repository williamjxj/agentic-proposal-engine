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
import { generateProposalFromJob, listStrategies } from '@/lib/api/client'

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
  const [isAIGenerating, setIsAIGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [strategies, setStrategies] = useState<{ id: string; name: string; is_default?: boolean }[]>([])
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null)

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
      strategy_id: selectedStrategyId,
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

  // Load strategies and default selection
  useEffect(() => {
    listStrategies()
      .then((list) => {
        setStrategies(list)
        const defaultStrategy = list.find((s) => s.is_default)
        if (defaultStrategy) setSelectedStrategyId(defaultStrategy.id)
        else if (list.length) setSelectedStrategyId(list[0].id)
      })
      .catch(() => {})
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

  // AI-assisted proposal generation (uses RAG + strategy + LLM)
  const handleAIGenerate = async () => {
    if (!jobContext) {
      setAiError('No job context available for AI generation')
      return
    }

    setIsAIGenerating(true)
    setAiError(null)

    try {
      const generated = await generateProposalFromJob({
        job_id: jobContext.id,
        job_title: jobContext.title,
        job_description: jobContext.description,
        job_skills: jobContext.skills ? jobContext.skills.split(',').map((s) => s.trim()) : undefined,
        strategy_id: selectedStrategyId || undefined,
      })

      if (generated) {
        setFormData((prev) => ({
          ...prev,
          title: generated.title,
          description: generated.description,
          budget: generated.budget || prev.budget,
          timeline: generated.timeline || prev.timeline,
          skills: generated.skills?.join(', ') || prev.skills,
        }))
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate proposal'
      setAiError(message)
      if (message.includes('429') || message.includes('wait')) {
        setAiError('Another proposal is being generated. Please wait and try again.')
      }
    } finally {
      setIsAIGenerating(false)
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

          <div className="mt-3 pt-3 border-t border-blue-200 dark:border-blue-900 space-y-2">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              💡 Your proposal is tailored to this job using AI, your knowledge base, and your selected strategy.
            </p>
            {strategies.length > 0 && (
              <div className="flex items-center gap-2 flex-wrap">
                <label className="text-xs font-medium text-blue-800 dark:text-blue-200">Strategy:</label>
                <select
                  value={selectedStrategyId || ''}
                  onChange={(e) => setSelectedStrategyId(e.target.value || null)}
                  className="text-xs rounded border border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 px-2 py-1 text-blue-900 dark:text-blue-100"
                >
                  {strategies.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}{s.is_default ? ' (default)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}
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
                disabled={isAIGenerating}
                className="text-sm text-primary hover:underline flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isAIGenerating ? '⏳ Generating...' : '✨ AI Generate'}
              </button>
            )}
          </div>
          {aiError && (
            <p className="text-sm text-red-600 dark:text-red-400 mb-2" role="alert">
              {aiError}
            </p>
          )}
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
        <p className="font-medium mb-2">💡 How this works</p>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong>Fill manually</strong> or use <strong>✨ AI Generate</strong> to auto-fill from the job + your knowledge base + strategy</li>
          <li><strong>Strategy</strong> (in Job Reference): Controls tone and focus. Create strategies under Strategies in the sidebar.</li>
          <li><strong>Submit Proposal</strong> saves to Proposals and links it to this job</li>
          <li>Auto-save keeps drafts; drafts recoverable for 24h</li>
        </ul>
      </div>
    </div>
  )
}
