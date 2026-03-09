/**
 * New Proposal Page
 *
 * Create new proposals with auto-save and draft recovery.
 * Demonstrates full auto-save workflow implementation.
 * Supports pre-filling from job discovery results.
 */

'use client'

import { Suspense, useState, useEffect, useMemo } from 'react'
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
import { generateProposalFromJob, getProject, listStrategies, listKeywords } from '@/lib/api/client'
import { useToast } from '@/lib/toast/toast-context'

interface ProposalFormData {
  title: string
  description: string
  budget: string
  timeline: string
  skills: string
  recipientEmail: string
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
    recipientEmail: '',
  })
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoaded, setIsLoaded] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [jobContext, setJobContext] = useState<JobContext | null>(null)
  const [showJobContext, setShowJobContext] = useState(true)
  const [isAIGenerating, setIsAIGenerating] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [strategies, setStrategies] = useState<{ id: string; name: string; is_default?: boolean }[]>([])
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null)
  const [selectedCollections, setSelectedCollections] = useState<string>('all') // 'all' | collection name
  const [keywords, setKeywords] = useState<{ id: string; keyword: string }[]>([])

  // Stable jobId for effect deps – avoids searchParams reference changes causing re-run storms
  const jobId = searchParams.get('jobId')

  // Load job context from sessionStorage (cache) or API by jobId – avoids passing model_response in URL
  useEffect(() => {
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

      // Extract email from job description
      const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/
      const emailMatch = (p.description || '').match(emailRegex)
      const extractedEmail = emailMatch ? emailMatch[0] : process.env.NEXT_PUBLIC_DEFAULT_PROPOSAL_EMAIL || 'bestitconsultingca@gmail.com'

      setFormData((prev) => ({
        ...prev,
        title: `Proposal for: ${p.title}`,
        budget: budgetStr || prev.budget,
        skills: skillsStr || prev.skills,
        description: prev.description || `I am interested in your project "${p.title}". `,
        recipientEmail: extractedEmail,
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
  }, [jobId])

  const editId = searchParams.get('editId')

  const getSafeDraftId = (id: string | null) => {
    if (!id || id === 'new') return 'new'

    // Standard UUID regex (36 chars with hyphens)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (uuidRegex.test(id)) return id

    // Hex string (32 chars) - often used for UUIDs without hyphens
    if (/^[0-9a-f]{32}$/i.test(id)) {
      return `${id.slice(0, 8)}-${id.slice(8, 12)}-${id.slice(12, 16)}-${id.slice(16, 20)}-${id.slice(20)}`
    }

    // Fallback: If not a UUID, it might be a collision risk if we use 'new'
    // But since the backend expects UUID in the path, we must provide one or 'new'
    return 'new'
  }

  const draftId = getSafeDraftId(editId || jobId)

  // Load existing proposal if editing
  useEffect(() => {
    if (!editId) {
      setIsLoaded(true)
      return
    }

    const loadProposal = async () => {
      try {
        const { getProposal } = await import('@/lib/api/client')
        const p = await getProposal(editId)
        if (p) {
          setFormData({
            title: p.title || '',
            description: p.description || '',
            budget: p.budget || '',
            timeline: p.timeline || '',
            skills: Array.isArray(p.skills) ? p.skills.join(', ') : '',
            recipientEmail: p.recipient_email || process.env.NEXT_PUBLIC_DEFAULT_PROPOSAL_EMAIL || 'bestitconsultingca@gmail.com',
          })
          if (p.job_id) {
            setJobContext({
              id: p.job_id,
              title: p.job_title || 'Linked Job',
              company: p.client_name || 'Unknown Company',
              description: '',
              platform: p.job_platform || 'Unknown',
            })
          }
          if (p.strategy_id) {
            setSelectedStrategyId(p.strategy_id)
          }
        }
      } catch (err) {
        console.error('Failed to load proposal for editing:', err)
        toast.error('Failed to load proposal')
      } finally {
        setIsLoaded(true)
      }
    }
    loadProposal()
  }, [editId])

  // Draft recovery
  const {
    showRecoveryPrompt,
    draft,
    recoverDraft,
    discardDraft,
    dismissPrompt,
  } = useDraftRecovery({
    entityType: 'proposal',
    entityId: draftId,
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
          recipientEmail: draftData.recipientEmail || process.env.NEXT_PUBLIC_DEFAULT_PROPOSAL_EMAIL || 'bestitconsultingca@gmail.com',
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
        recipientEmail: process.env.NEXT_PUBLIC_DEFAULT_PROPOSAL_EMAIL || 'bestitconsultingca@gmail.com',
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
    entityId: draftId,
    data: useMemo(
      () => ({
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
      }),
      [
        formData.title,
        formData.description,
        formData.budget,
        formData.timeline,
        formData.skills,
        jobContext?.id,
        jobContext?.title,
        jobContext?.company,
        jobContext?.description,
        jobContext?.platform,
        jobContext?.skills,
        jobContext?.budget,
        jobContext?.model_response,
        selectedStrategyId,
      ]
    ),
    enabled: isInitialized && isLoaded && !showRecoveryPrompt,
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
        const arr = Array.isArray(list) ? list : []
        setStrategies(arr)
        const defaultStrategy = arr.find((s) => s.is_default)
        if (defaultStrategy) setSelectedStrategyId(defaultStrategy.id)
        else if (arr.length) setSelectedStrategyId(arr[0].id)
      })
      .catch(() => {})
  }, [])

  // Load active keywords (used automatically by AI generate)
  useEffect(() => {
    listKeywords({ is_active: true })
      .then((list) => setKeywords(list.map((k) => ({ id: k.id, keyword: k.keyword }))))
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
  const handleSubmit = async (e: React.FormEvent, saveAsDraft = false) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const { createProposal, updateProposal, discardDraft } = await import('@/lib/api/client')

      const skillsArr = formData.skills
        ? formData.skills.split(',').map((s) => s.trim()).filter(Boolean)
        : []

      const proposalData = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        budget: formData.budget?.trim() || undefined,
        timeline: formData.timeline?.trim() || undefined,
        skills: skillsArr,
        recipient_email: formData.recipientEmail?.trim() || undefined,
        job_id: jobContext?.id,
        job_platform: jobContext?.platform,
        client_name: jobContext?.company,
        strategy_id: selectedStrategyId || undefined,
        generated_with_ai: false,
        status: saveAsDraft ? 'draft' : 'submitted',
      }

      if (editId) {
        await updateProposal(editId, proposalData)
      } else {
        await createProposal(proposalData)
      }

      // Clear draft so it doesn't appear in recovery
      discardDraft('proposal', draftId).catch(() => {})

      toast.success(saveAsDraft ? 'Draft saved successfully!' : 'Proposal submitted successfully!')
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
        collections:
          selectedCollections && selectedCollections !== 'all'
            ? [selectedCollections]
            : undefined,
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

  if (!isInitialized || !isLoaded) {
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
          { label: editId ? 'Edit Proposal' : 'New Proposal' },
        ]}
      />
      <PageHeader title={editId ? 'Edit Proposal' : 'New Proposal'}>
        <AutoSaveIndicator
          status={saveStatus}
          lastSaved={lastSaved}
          error={saveError}
          hasUnsavedChanges={hasUnsavedChanges}
          onManualSave={saveNow}
        />
      </PageHeader>

      {/* Missing Job Context Warning */}
      {!jobContext && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <p className="font-medium flex items-center gap-2">
            <span>⚠️</span> No job reference linked
          </p>
          <p className="mt-1">
            You are creating a standalone proposal. For a better experience with AI generation tailored to a specific job, we recommend starting from the <Button variant="link" className="h-auto p-0 text-amber-800 dark:text-amber-200 underline font-medium" onClick={() => router.push('/projects')}>Projects</Button> page.
          </p>
        </div>
      )}

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
        </CardContent>
        </Card>
      )}

      {/* AI Generate Feature Banner */}
      {jobContext && (
        <Card className="border-2 border-primary/20 bg-linear-to-br from-primary/5 via-primary/3 to-transparent dark:from-primary/10 dark:via-primary/5 shadow-sm">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 flex-1">
                <h3 className="text-lg font-bold flex items-center gap-2 text-primary">
                  <span className="text-2xl">✨</span>
                  AI-Powered Proposal Generator
                </h3>
                <p className="text-sm text-muted-foreground">
                  Let AI craft a personalized, winning proposal using your knowledge base and selected strategy.
                </p>
              </div>
              <Button
                type="button"
                size="lg"
                className="shimmer-button min-w-40 gap-2 shadow-lg hover:shadow-xl transition-all"
                onClick={handleAIGenerate}
                disabled={isAIGenerating}
              >
                {isAIGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin shrink-0" />
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="text-lg">✨</span>
                    AI Generate
                  </>
                )}
              </Button>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1.5 rounded">
                <span>🎯</span>
                <span>Tailored to job requirements</span>
              </div>
              <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1.5 rounded">
                <span>📚</span>
                <span>Uses your knowledge base</span>
              </div>
              <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1.5 rounded">
                <span>🎨</span>
                <span>Applies your strategy</span>
              </div>
              <div className="flex items-center gap-1.5 bg-background/50 px-2.5 py-1.5 rounded">
                <span>⚡</span>
                <span>Saves you hours</span>
              </div>
            </div>
            {aiError && (
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive" role="alert">
                  {aiError}
                </p>
              </div>
            )}
            {strategies.length > 0 && (
              <div className="mt-3 pt-3 border-t space-y-3">
                <div className="flex items-center gap-3 flex-wrap">
                  <Label className="text-xs font-medium whitespace-nowrap">Strategy:</Label>
                  <Select
                    value={selectedStrategyId || ''}
                    onValueChange={(v) => setSelectedStrategyId(v || null)}
                  >
                    <SelectTrigger className="w-50 h-9 text-xs min-w-[200px]">
                      <SelectValue placeholder="Select strategy" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {strategies.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}{s.is_default ? ' (default)' : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">Choose the tone and approach for your proposal</span>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <Label className="text-xs font-medium whitespace-nowrap">Knowledge base:</Label>
                  <Select
                    value={selectedCollections}
                    onValueChange={setSelectedCollections}
                  >
                    <SelectTrigger className="w-50 h-9 text-xs min-w-[180px]">
                      <SelectValue placeholder="Select collection" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All collections (default)</SelectItem>
                      <SelectItem value="case_studies">Case Studies</SelectItem>
                      <SelectItem value="team_profiles">Team Profiles</SelectItem>
                      <SelectItem value="portfolio">Portfolio</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-xs text-muted-foreground">Which KB to use for RAG context</span>
                </div>
                {keywords.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Label className="text-xs font-medium whitespace-nowrap pt-1">Keywords used:</Label>
                    <div className="flex-1 flex flex-wrap gap-1.5">
                      {keywords.map((k) => (
                        <span
                          key={k.id}
                          className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-xs"
                        >
                          {k.keyword}
                        </span>
                      ))}
                    </div>
                    <Button
                      type="button"
                      variant="link"
                      className="text-xs h-auto p-0"
                      onClick={() => router.push('/keywords')}
                    >
                      Manage
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Proposal Form */}
      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6">
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
          <Label htmlFor="description">Description *</Label>
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
            <Label htmlFor="budget" className="flex items-center gap-1.5">
              Budget
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              type="text"
              id="budget"
              value={formData.budget}
              onChange={(e) => handleChange('budget', e.target.value)}
              placeholder="e.g., $5,000 - $10,000"
              className="mt-2"
            />
          </div>
          <div>
            <Label htmlFor="timeline" className="flex items-center gap-1.5">
              Timeline
              <span className="text-xs font-normal text-muted-foreground">(optional)</span>
            </Label>
            <Input
              type="text"
              id="timeline"
              value={formData.timeline}
              onChange={(e) => handleChange('timeline', e.target.value)}
              placeholder="e.g., 4-6 weeks"
              className="mt-2"
            />
          </div>
        </div>

        {/* Recipient Email */}
        <div>
          <Label htmlFor="recipientEmail">Recipient Email *</Label>
          <Input
            type="email"
            id="recipientEmail"
            value={formData.recipientEmail}
            onChange={(e) => handleChange('recipientEmail', e.target.value)}
            required
            placeholder="customer@example.com"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            Email address where the proposal will be sent. Auto-detected from job description.
          </p>
        </div>

        {/* Skills */}
        <div>
          <Label htmlFor="skills" className="flex items-center gap-1.5">
            Required Skills
            <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Input
            type="text"
            id="skills"
            value={formData.skills}
            onChange={(e) => handleChange('skills', e.target.value)}
            placeholder="e.g., React, TypeScript, Node.js (comma-separated)"
            className="mt-2"
          />
          <p className="text-xs text-muted-foreground mt-1">
            💡 These skills help the AI emphasize your expertise during generation.
          </p>
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
              editId ? 'Update Proposal' : 'Submit Proposal'
            )}
          </Button>
          <Button
            type="button"
            variant="secondary"
            onClick={(e) => handleSubmit(e as any, true)}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin shrink-0 mr-2" />
                Saving...
              </>
            ) : (
              'Save as Draft'
            )}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.push(editId ? `/proposals/${editId}` : '/proposals')}
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
            <li><strong>AI Generate</strong>: Auto-fill using job details + your knowledge base + selected strategy</li>
            <li><strong>Auto-save</strong>: Your work is automatically saved every few seconds while you type</li>
            <li><strong>Save as Draft</strong>: Save to Proposals → Drafts tab for later completion</li>
            <li><strong>Submit Proposal</strong>: Mark as submitted and link to the job</li>
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
