/**
 * Proposal Detail Page
 *
 * Displays proposal content with quality score and suggestions (T034, FR-009).
 */

'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { PageHeader } from '@/components/shared/page-header'
import { PageContainer } from '@/components/shared/page-container'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { getProposal, getProposalQuality, deleteProposal } from '@/lib/api/client'
import { LoadingSkeleton } from '@/components/workflow/progress-overlay'
import { MarkdownViewer } from '@/components/shared/markdown-viewer'
import { ArrowLeft, Trash2, Edit, AlertTriangle } from 'lucide-react'
import { useToast } from '@/lib/toast/toast-context'

export default function ProposalDetailPage() {
  const router = useRouter()
  const params = useParams()
  const id = params?.id as string
  const [proposal, setProposal] = useState<any | null>(null)
  const [quality, setQuality] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isDeleting, setIsDeleting] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [qualityError, setQualityError] = useState<string | null>(null)
  const toast = useToast()

  useEffect(() => {
    async function load() {
      if (!id) return
      setIsLoading(true)
      try {
        const p = await getProposal(id)
        setProposal(p)
        if (p) {
          try {
            const q = await getProposalQuality(id)
            setQuality(q)
          } catch {
            setQualityError('Quality data not available')
          }
        }
      } catch (error) {
        console.error('Error loading proposal:', error)
        setProposal(null)
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [id])

  const handleDelete = async () => {
    if (!id) return
    setIsDeleting(true)
    try {
      await deleteProposal(id)
      toast.success('Proposal deleted successfully')
      router.push('/proposals')
    } catch (error) {
      console.error('Error deleting proposal:', error)
      toast.error('Failed to delete proposal')
    } finally {
      setIsDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <LoadingSkeleton lines={8} />
      </PageContainer>
    )
  }

  if (!proposal) {
    return (
      <PageContainer>
        <p className="text-muted-foreground">Proposal not found.</p>
        <Button variant="outline" onClick={() => router.push('/proposals')} className="mt-4">
          Back to Proposals
        </Button>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-6">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push('/proposals')}
          aria-label="Back to proposals"
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={proposal.title}
          description={`Status: ${proposal.status}`}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary" className="capitalize">
          {proposal.status}
        </Badge>
        {proposal.source === 'auto_generated' && (
          <Badge variant="outline">Auto-generated</Badge>
        )}
        {proposal.quality_score != null && (
          <Badge variant="default">Quality: {proposal.quality_score}/100</Badge>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Main Content Column */}
        <div className="flex-1 space-y-6">
          <Card className="overflow-hidden border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-slate-50/50 dark:bg-slate-900/50 py-4">
              <h3 className="font-semibold text-lg flex items-center gap-2">
                <span className="text-xl">📄</span> Proposal Draft
              </h3>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => router.push(`/proposals/new?jobId=${proposal.job_id}&editId=${proposal.id}`)}
                  className="h-8"
                >
                  <Edit className="h-4 w-4 mr-2" /> Edit
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowDeleteConfirm(true)}
                  className="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive border-slate-200 dark:border-slate-800"
                >
                  <Trash2 className="h-4 w-4 mr-2" /> Delete
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {proposal.budget && (
                <div className="px-6 py-4 flex flex-wrap gap-6 border-b bg-muted/20 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground font-medium">Budget:</span>
                    <Badge variant="outline" className="font-semibold bg-white dark:bg-slate-950">
                      {proposal.budget}
                    </Badge>
                  </div>
                  {proposal.timeline && (
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground font-medium">Timeline:</span>
                      <Badge variant="outline" className="font-semibold bg-white dark:bg-slate-950">
                        {proposal.timeline}
                      </Badge>
                    </div>
                  )}
                </div>
              )}
              <div className="p-6 md:p-10 bg-white dark:bg-slate-950">
                <MarkdownViewer content={proposal.description} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Column: Quality & Meta */}
        <div className="w-full lg:w-80 space-y-6">
          {(quality || proposal.quality_score != null) && (
            <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
              <CardHeader className="pb-3 border-b">
                <h3 className="font-semibold text-sm">Quality Analysis</h3>
              </CardHeader>
              <CardContent className="pt-6 space-y-6">
                {qualityError && (
                  <p className="text-sm text-muted-foreground">{qualityError}</p>
                )}
                
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Overall Score</span>
                    <span className="font-bold text-primary">
                      {quality?.overall_score ?? proposal.quality_score ?? 0}/100
                    </span>
                  </div>
                  <Progress
                    value={quality?.overall_score ?? proposal.quality_score ?? 0}
                    className="h-2"
                  />
                </div>

                {quality?.dimension_scores && Object.entries(quality.dimension_scores).length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Breakdown
                    </h4>
                    <div className="grid gap-2">
                      {Object.entries(quality.dimension_scores).map(([dim, score]) => (
                        <div key={dim} className="space-y-1">
                          <div className="flex justify-between text-xs">
                            <span className="capitalize">{dim}</span>
                            <span>{Math.round(Number(score))}%</span>
                          </div>
                          <Progress value={Number(score)} className="h-1" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {quality?.suggestions && quality.suggestions.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Suggestions
                    </h4>
                    <ul className="space-y-2">
                      {quality.suggestions.map((s: string, i: number) => (
                        <li key={i} className="text-xs leading-relaxed text-muted-foreground bg-slate-50 dark:bg-slate-900 p-2 rounded border border-slate-100 dark:border-slate-800">
                          • {s}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card className="border-slate-200 dark:border-slate-800 shadow-sm">
            <CardHeader className="pb-3 border-b text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Proposal Metadata
            </CardHeader>
            <CardContent className="pt-4 space-y-3 text-xs">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Platform</span>
                <span className="font-medium capitalize">{proposal.job_platform || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Created</span>
                <span className="font-medium">{new Date(proposal.created_at).toLocaleDateString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Last Updated</span>
                <span className="font-medium">{new Date(proposal.updated_at).toLocaleDateString()}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Manual Delete Modal (WOW aesthetics) */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-3 text-destructive">
                <div className="p-2 rounded-full bg-destructive/10">
                  <AlertTriangle className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold">Delete Proposal?</h3>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm">
                Are you sure you want to delete <strong>"{proposal.title}"</strong>? This action will permanently remove it from your records.
              </p>
            </CardContent>
            <div className="flex gap-3 p-6 pt-2 justify-end">
              <Button variant="ghost" onClick={() => setShowDeleteConfirm(false)} disabled={isDeleting}>
                Cancel
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleDelete} 
                className="bg-red-600 hover:bg-red-700"
                disabled={isDeleting}
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete Proposal'}
              </Button>
            </div>
          </Card>
        </div>
      )}
    </PageContainer>
  )
}
