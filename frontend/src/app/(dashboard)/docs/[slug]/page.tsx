/**
 * Documentation Viewer Page
 * Displays markdown documentation files from docs/ folder
 */

'use client'

import { PageContainer } from '@/components/shared/page-container'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import { use } from 'react'

interface PageProps {
  params: Promise<{ slug: string }>
}

// Mapping of slugs to documentation info
const DOCS_MAP: Record<string, { title: string; description: string; githubPath: string }> = {
  'setup-and-run': {
    title: 'Setup & Run Guide',
    description: '10-minute infrastructure and application setup',
    githubPath: 'docs/setup-and-run.md',
  },
  'user-guides': {
    title: 'User Manual',
    description: 'Complete navigation and workflow guide',
    githubPath: 'docs/user-guides.md',
  },
  'proposal-workflow-ui': {
    title: 'Proposal Workflow',
    description: 'Step-by-step proposal creation process',
    githubPath: 'docs/proposal-workflow-ui.md',
  },
  'huggingface-job-discovery': {
    title: 'Job Discovery',
    description: 'HuggingFace dataset integration',
    githubPath: 'docs/huggingface-job-discovery.md',
  },
  'ai-proposal-generation-concepts': {
    title: 'AI Proposal Concepts',
    description: 'How RAG + Knowledge Base + Strategy work together',
    githubPath: 'docs/ai-proposal-generation-concepts.md',
  },
  'knowledge-base': {
    title: 'Knowledge Base Setup',
    description: 'Document upload and RAG integration',
    githubPath: 'docs/knowledge-base.md',
  },
  'autonomous-automation-strategy': {
    title: 'Autonomous Features',
    description: 'Auto-bidding strategy and automation',
    githubPath: 'docs/autonomous-automation-strategy.md',
  },
  'database-schema-reference': {
    title: 'Database Schema',
    description: 'PostgreSQL schema documentation',
    githubPath: 'docs/database-schema-reference.md',
  },
  'saas-roadmap': {
    title: 'Product Roadmap',
    description: 'Planned features and future development',
    githubPath: 'docs/saas-roadmap.md',
  },
}

export default function DocPage({ params }: PageProps) {
  const router = useRouter()
  const resolvedParams = use(params)
  const { slug } = resolvedParams

  const doc = DOCS_MAP[slug]

  if (!doc) {
    return (
      <PageContainer>
        <Card>
          <CardHeader>
            <CardTitle>Documentation Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground mb-4">
              The requested documentation page could not be found.
            </p>
            <Button onClick={() => router.push('/dashboard')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </CardContent>
        </Card>
      </PageContainer>
    )
  }

  const githubUrl = `https://github.com/williamjxj/agentic-proposal-engine/blob/main/${doc.githubPath}`

  return (
    <PageContainer>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="mb-3"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <h1 className="text-3xl font-bold tracking-tight">{doc.title}</h1>
            <p className="text-muted-foreground mt-2">{doc.description}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(githubUrl, '_blank')}
          >
            <ExternalLink className="mr-2 h-4 w-4" />
            View on GitHub
          </Button>
        </div>

        {/* Content Card */}
        <Card>
          <CardContent className="pt-6">
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div className="rounded-lg bg-muted/50 p-6 border">
                <h3 className="text-lg font-semibold mb-3">📖 How to Read This Documentation</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  This documentation is stored in the repository&apos;s <code>docs/</code> folder.
                  For the best reading experience with proper markdown rendering, diagrams, and code highlighting:
                </p>
                <Button
                  onClick={() => window.open(githubUrl, '_blank')}
                  className="w-full sm:w-auto"
                >
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open Full Documentation on GitHub
                </Button>
              </div>

              {/* Quick Info */}
              <div className="mt-6 space-y-4">
                <div className="rounded-lg border p-4 bg-background">
                  <h4 className="font-semibold mb-2">📍 File Location</h4>
                  <code className="text-sm text-muted-foreground">
                    {doc.githubPath}
                  </code>
                </div>

                <div className="rounded-lg border p-4 bg-background">
                  <h4 className="font-semibold mb-2">🔗 Related Documentation</h4>
                  <div className="space-y-2 mt-3">
                    {slug === 'setup-and-run' && (
                      <>
                        <DocLink title="Quickstart Flow Diagram" href="/docs/quickstart-flow" />
                        <DocLink title="User Guides" href="/docs/user-guides" />
                      </>
                    )}
                    {slug === 'user-guides' && (
                      <>
                        <DocLink title="Proposal Workflow" href="/docs/proposal-workflow-ui" />
                        <DocLink title="Job Discovery" href="/docs/huggingface-job-discovery" />
                      </>
                    )}
                    {slug === 'proposal-workflow-ui' && (
                      <>
                        <DocLink title="AI Concepts" href="/docs/ai-proposal-generation-concepts" />
                        <DocLink title="Knowledge Base" href="/docs/knowledge-base" />
                      </>
                    )}
                    {slug === 'ai-proposal-generation-concepts' && (
                      <>
                        <DocLink title="Knowledge Base Setup" href="/docs/knowledge-base" />
                        <DocLink title="User Guides" href="/docs/user-guides" />
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}

function DocLink({ title, href }: { title: string; href: string }) {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push(href)}
      className="flex items-center gap-2 text-sm text-primary hover:underline"
    >
      <ExternalLink className="h-3 w-3" />
      {title}
    </button>
  )
}
