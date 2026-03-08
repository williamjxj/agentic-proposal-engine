/**
 * New Proposal Page
 *
 * Create new proposals with auto-save and draft recovery.
 * Demonstrates full auto-save workflow implementation.
 * Supports pre-filling from job discovery results.
 */

'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAutoSave } from '@/hooks/useAutoSave'
import { useDraftRecovery } from '@/hooks/useDraftRecovery'
import { AutoSaveIndicator, DraftRecoveryBanner } from '@/components/workflow/auto-save-indicator'
import { LoadingSkeleton } from '@/components/workflow/progress-overlay'
import { PageHeader } from '@/components/shared/page-header'
import { PageContainer } from '@/components/shared/page-container'
import { Breadcrumb } from '@/components/shared/breadcrumb'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'
import { generateProposalFromJob, getProject, listStrategies } from '@/lib/api/client'
import { useToast } from '@/lib/toast/toast-context'

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
  model_response?: string  // Structured job analysis (Core Responsibilities, Required Skills, etc.)
}

function NewProposalPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const toast = useToast()
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

  // Load job context from sessionStorage (cache) or API by jobId – avoids passing model_response in URL
  useEffect(() => {
    const jobId = searchParams.get('jobId')
    if (!jobId) return

    const applyProject = (p: {
      id: string
      title: string
      company?: string
      description?: string
      platform?: string
      skills?: string[]
      budget?: { min?: number; max?: number }
      model_response?: string
    }) => {
      const skillsStr = Array.isArray(p.skills) ? p.skills.join(', ') : ''
      const budgetStr =
        p.budget?.min != null && p.budget?.max != null
          ? `$${p.budget.min} - $${p.budget.max}`
          : undefined

      setJobContext({
        id: p.id,
        title: p.title,
        company: p.company || 'Unknown Company',
        description: p.description || '',
        platform: p.platform || 'Unknown',
        skills: skillsStr || undefined,
        budget: budgetStr,
        model_response: p.model_response,
      })
      setFormData((prev) => ({
        ...prev,
        title: `Proposal for: ${p.title}`,
        budget: budgetStr || prev.budget,
        skills: skillsStr || prev.skills,
        description: prev.description || `I am interested in your project "${p.title}". `,
      }))
    }

    // 1. Try sessionStorage first (same-tab navigation from projects)
    try {
      const cached = sessionStorage.getItem(`proposal_job_${jobId}`)
      if (cached) {
        const project = JSON.parse(cached) as Parameters<typeof applyProject>[0]
        if (project?.id && project?.title) {
          applyProject(project)
          return
        }
      }
    } catch (_) {
      // Ignore parse errors
    }

    // 2. Fallback: fetch from API (new tab, bookmark, refresh)
    getProject(jobId).then((project) => {
      if (project) applyProject(project)
    })
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
            model_response: draftData.jobModelResponse,
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
      jobModelResponse: jobContext?.model_response,
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

  // Handle form submission - create proposal directly from form data (no draft dependency)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const { createProposal, discardDraft } = await import('@/lib/api/client')

      const skillsArr = formData.skills
        ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean)
        : []

      await createProposal({
        title: formData.title.trim(),
        description: formData.description.trim(),
        budget: formData.budget?.trim() || undefined,
        timeline: formData.timeline?.trim() || undefined,
        skills: skillsArr,
        job_platform: jobContext?.platform,
        client_name: jobContext?.company,
        strategy_id: selectedStrategyId || undefined,
        generated_with_ai: false,
        status: 'submitted',
      })

      // Clear draft so it doesn't appear in recovery
      discardDraft('proposal', 'new').catch(() => {})

      toast.success('Proposal submitted successfully!')
      router.push('/proposals')
    } catch (err: unknown) {
      const message =
        err instanceof Error
          ? err.message
          : 'Failed to submit proposal. Please check if all required fields are filled correctly.'
      console.error('Failed to submit proposal:', err)
      setError(message)
      toast.error(err)
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
        job_company: jobContext.company,
        job_skills: jobContext.skills ? jobContext.skills.split(',').map((s) => s.trim()) : undefined,
        job_model_response: jobContext.model_response,
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
      const displayMsg = message.includes('429') || message.includes('wait')
        ? 'Another proposal is being generated. Please wait and try again.'
        : message
      setAiError(displayMsg)
      toast.error(err)
    } finally {
      setIsAIGenerating(false)
    }
  }

  if (!isInitialized) {
    return (
      <PageContainer>
        <PageHeader title="New Proposal" />
        <LoadingSkeleton lines={5} />
      </PageContainer>
    )
  }

  const steps = jobContext
    ? [
        { id: 1, label: 'Job Reference', done: true },
        { id: 2, label: 'Proposal Details', done: false },
        { id: 3, label: 'Submit', done: false },
      ]
    : [
        { id: 1, label: 'Proposal Details', done: false },
        { id: 2, label: 'Submit', done: false },
      ]

  return (
    <PageContainer className="max-w-4xl mx-auto space-y-6">
      <Breadcrumb
        items={[
          { label: 'Proposals', href: '/proposals' },
          { label: 'New Proposal' },
        ]}
      />
      <PageHeader title="New Proposal">
        <AutoSaveIndicator
          status={saveStatus}
          lastSaved={lastSaved}
          error={saveError}
          hasUnsavedChanges={hasUnsavedChanges}
          onManualSave={saveNow}
        />
      </PageHeader>

      {/* Step indicators */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {steps.map((step, i) => (
          <span key={step.id} className="flex items-center gap-2">
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium',
                step.done
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {step.done ? '✓' : step.id}
            </span>
            <span>{step.label}</span>
            {i < steps.length - 1 && (
              <span className="text-muted-foreground/60">→</span>
            )}
          </span>
        ))}
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
        <Card className="shine-border border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950">
          <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">💼</span>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100">
                Job Reference
              </h3>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowJobContext(false)}
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 h-8 w-8"
              title="Hide job context"
            >
              ✕
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-2">

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
                <Label className="text-xs font-medium text-blue-800 dark:text-blue-200">Strategy:</Label>
                <Select
                  value={selectedStrategyId || ''}
                  onValueChange={(v) => setSelectedStrategyId(v || null)}
                >
                  <SelectTrigger className="w-[180px] h-8 text-xs border-blue-300 dark:border-blue-700 bg-white dark:bg-slate-800 text-blue-900 dark:text-blue-100">
                    <SelectValue placeholder="Select strategy" />
                  </SelectTrigger>
                  <SelectContent>
                    {strategies.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}{s.is_default ? ' (default)' : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardContent>
        </Card>
      )}

      {/* Proposal Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <Label htmlFor="title">Proposal Title *</Label>
          <Input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            required
            placeholder="Enter a compelling title for your proposal"
            className="mt-2"
          />
        </div>

        {/* Description */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label htmlFor="description">Description *</Label>
            {jobContext && (
              <Button
                type="button"
                variant="link"
                className="h-auto p-0 text-sm gap-1.5"
                onClick={handleAIGenerate}
                disabled={isAIGenerating}
              >
                {isAIGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin shrink-0" />
                    Generating...
                  </>
                ) : (
                  <>✨ AI Generate</>
                )}
              </Button>
            )}
          </div>
          {aiError && (
            <p className="text-sm text-destructive mb-2" role="alert">
              {aiError}
            </p>
          )}
          <Textarea
            id="description"
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            required
            rows={8}
            placeholder="Describe your approach, methodology, and what makes your proposal unique"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Minimum 100 characters (currently: {formData.description.length})
          </p>
        </div>

        {/* Budget & Timeline */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="budget">Budget *</Label>
            <Input
              type="text"
              id="budget"
              value={formData.budget}
              onChange={(e) => handleChange('budget', e.target.value)}
              required
              placeholder="e.g., $5,000 - $10,000"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="timeline">Timeline *</Label>
            <Input
              type="text"
              id="timeline"
              value={formData.timeline}
              onChange={(e) => handleChange('timeline', e.target.value)}
              required
              placeholder="e.g., 4-6 weeks"
              className="mt-2"
            />
          </div>
        </div>

        {/* Skills */}
        <div>
          <Label htmlFor="skills">Required Skills</Label>
          <Input
            type="text"
            id="skills"
            value={formData.skills}
            onChange={(e) => handleChange('skills', e.target.value)}
            placeholder="e.g., React, TypeScript, Node.js (comma-separated)"
            className="mt-2"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-4 pt-4 border-t">
          <Button
            type="submit"
            className="shimmer-button"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0 mr-2" />
                Submitting...
              </>
            ) : (
              'Submit Proposal'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push('/proposals')}
          >
            Cancel
          </Button>

          {/* Save Status Info */}
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <span>Version {currentVersion}</span>
            {hasUnsavedChanges && <span>• Unsaved</span>}
          </div>
        </div>
      </form>

      {/* Help Text */}
      <Card>
        <CardContent className="pt-6">
          <p className="font-medium mb-2">💡 How this works</p>
          <ul className="space-y-1 list-disc list-inside text-sm text-muted-foreground">
            <li><strong>Fill manually</strong> or use <strong>✨ AI Generate</strong> to auto-fill from the job + your knowledge base + strategy</li>
            <li><strong>Strategy</strong> (in Job Reference): Controls tone and focus. Create strategies under Strategies in the sidebar.</li>
            <li><strong>Submit Proposal</strong> saves to Proposals and links it to this job</li>
            <li>Auto-save keeps drafts; drafts recoverable for 24h</li>
          </ul>
        </CardContent>
      </Card>
    </PageContainer>
  )
}

export default function NewProposalPage() {
  return (
    <Suspense fallback={
      <PageContainer>
        <PageHeader title="New Proposal" />
        <LoadingSkeleton lines={8} />
      </PageContainer>
    }>
      <NewProposalPageContent />
    </Suspense>
  )
}
