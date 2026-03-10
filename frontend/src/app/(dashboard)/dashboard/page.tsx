/**
 * Dashboard Page - Onboarding & Workflow Guide
 * Focus: User education, workflow visualization, documentation links
 */

'use client'

import { PageContainer } from '@/components/shared/page-container'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  FileText,
  Sparkles,
  ArrowRight,
  Upload,
  Briefcase,
  Target,
  BookOpen,
  PlayCircle,
  Rocket,
  Github,
  ExternalLink,
} from 'lucide-react'
import { cn } from '@/lib/utils'

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
}

const stagger = {
  visible: {
    transition: {
      staggerChildren: 0.1,
    },
  },
}

export default function DashboardPage() {
  const router = useRouter()

  return (
    <PageContainer>
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="space-y-6 pb-8"
      >
        {/* Hero Section */}
        <motion.div variants={fadeInUp} className="text-center space-y-4 py-8">
          <div className="flex items-center justify-center gap-3">
            <Rocket className="h-8 w-8 text-primary" />
            <h1 className="text-4xl font-bold tracking-tight">
              Agentic Proposal Engine
            </h1>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            AI-powered proposal generation platform that helps you discover jobs,
            build knowledge bases, and create winning proposals with RAG technology.
          </p>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="px-3 py-1">
              <Sparkles className="h-3 w-3 mr-1" />
              RAG-Powered
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              🎯 Auto-Discovery
            </Badge>
            <Badge variant="secondary" className="px-3 py-1">
              ⚡ Real-time Generation
            </Badge>
          </div>
        </motion.div>

        {/* Workflow Diagram */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PlayCircle className="h-5 w-5 text-primary" />
                How It Works — 4-Step Workflow
              </CardTitle>
              <CardDescription>
                Follow this simple workflow to start generating AI-powered proposals
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* Mermaid Diagram Visualization using styled divs */}
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <WorkflowStep
                    number={1}
                    icon={Upload}
                    title="Upload Knowledge Base"
                    description="Add your portfolio documents (PDFs, DOCX) for RAG context"
                    color="blue"
                    path="/knowledge-base"
                  />
                  <WorkflowStep
                    number={2}
                    icon={Target}
                    title="Set Keywords"
                    description="Define search terms to filter relevant job opportunities"
                    color="purple"
                    path="/keywords"
                  />
                  <WorkflowStep
                    number={3}
                    icon={Briefcase}
                    title="Discover Projects"
                    description="Run ETL to scrape jobs from HuggingFace datasets"
                    color="amber"
                    path="/projects"
                  />
                  <WorkflowStep
                    number={4}
                    icon={Sparkles}
                    title="Generate Proposals"
                    description="Create AI-powered proposals with your knowledge base"
                    color="green"
                    path="/proposals"
                  />
                </div>

                {/* Flow Arrows */}
                <div className="hidden md:block relative h-2">
                  <svg className="absolute inset-0 w-full h-full" style={{ top: '-80px' }}>
                    <defs>
                      <marker
                        id="arrowhead"
                        markerWidth="10"
                        markerHeight="10"
                        refX="9"
                        refY="3"
                        orient="auto"
                      >
                        <polygon
                          points="0 0, 10 3, 0 6"
                          fill="currentColor"
                          className="text-primary"
                        />
                      </marker>
                    </defs>
                    <line
                      x1="23%"
                      y1="50%"
                      x2="27%"
                      y2="50%"
                      stroke="currentColor"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                      className="text-primary"
                    />
                    <line
                      x1="48%"
                      y1="50%"
                      x2="52%"
                      y2="50%"
                      stroke="currentColor"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                      className="text-primary"
                    />
                    <line
                      x1="73%"
                      y1="50%"
                      x2="77%"
                      y2="50%"
                      stroke="currentColor"
                      strokeWidth="2"
                      markerEnd="url(#arrowhead)"
                      className="text-primary"
                    />
                  </svg>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Start Actions */}
        <motion.div variants={fadeInUp}>
          <Card>
            <CardHeader>
              <CardTitle>🚀 Quick Start</CardTitle>
              <CardDescription>
                Start your first proposal generation workflow
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Button
                size="lg"
                className="w-full justify-start h-auto p-4"
                onClick={() => router.push('/knowledge-base')}
              >
                <Upload className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Upload Documents</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    Add portfolio files for AI context
                  </div>
                </div>
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>

              <Button
                variant="outline"
                size="lg"
                className="w-full justify-start h-auto p-4"
                onClick={() => router.push('/projects')}
              >
                <Briefcase className="mr-3 h-5 w-5" />
                <div className="text-left">
                  <div className="font-semibold">Discover Jobs</div>
                  <div className="text-xs text-muted-foreground font-normal">
                    Browse opportunities from datasets
                  </div>
                </div>
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Documentation & Resources */}
        <motion.div variants={fadeInUp} className="grid gap-6 md:grid-cols-2">
          {/* User Guides */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                User Guides
              </CardTitle>
              <CardDescription>
                Learn how to navigate and use the platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <DocLink
                title="Setup & Run Guide"
                description="10-minute infrastructure setup"
                href="/docs/setup-and-run"
              />
              <DocLink
                title="User Manual"
                description="Complete navigation guide"
                href="/docs/user-guides"
              />
              <DocLink
                title="Proposal Workflow"
                description="Step-by-step proposal creation"
                href="/docs/proposal-workflow-ui"
              />
              <DocLink
                title="Job Discovery"
                description="HuggingFace dataset integration"
                href="/docs/huggingface-job-discovery"
              />
            </CardContent>
          </Card>

          {/* Technical Documentation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Technical Docs
              </CardTitle>
              <CardDescription>
                Deep dive into platform architecture
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <DocLink
                title="AI Proposal Concepts"
                description="How RAG + Knowledge Base works"
                href="/docs/ai-proposal-generation-concepts"
              />
              <DocLink
                title="Knowledge Base Setup"
                description="Document upload & RAG integration"
                href="/docs/knowledge-base"
              />
              <DocLink
                title="Autonomous Features"
                description="Auto-bidding strategy guide"
                href="/docs/autonomous-automation-strategy"
              />
              <DocLink
                title="Database Schema"
                description="PostgreSQL schema reference"
                href="/docs/database-schema-reference"
              />
            </CardContent>
          </Card>
        </motion.div>

        {/* Tips & Best Practices */}
        <motion.div variants={fadeInUp}>
          <Card className="border-primary/20 bg-linear-to-br from-primary/5 to-primary/10">
            <CardHeader>
              <CardTitle>💡 Tips for Success</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
                <TipCard
                  title="Start with Knowledge Base"
                  description="Upload 3-5 portfolio documents before generating proposals for better AI context"
                />
                <TipCard
                  title="Use Specific Keywords"
                  description="Add targeted keywords (e.g., 'React', 'Python') to filter relevant jobs"
                />
                <TipCard
                  title="Review Before Submitting"
                  description="AI proposals are drafts — always personalize before submitting"
                />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Footer Links */}
        <motion.div variants={fadeInUp} className="flex items-center justify-center gap-4 pt-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => window.open('https://github.com/williamjxj/agentic-proposal-engine', '_blank')}
          >
            <Github className="mr-2 h-4 w-4" />
            View on GitHub
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/docs/saas-roadmap')}
          >
            <Rocket className="mr-2 h-4 w-4" />
            Product Roadmap
          </Button>
        </motion.div>
      </motion.div>
    </PageContainer>
  )
}

// Helper Components

interface WorkflowStepProps {
  number: number
  icon: React.ElementType
  title: string
  description: string
  color: 'blue' | 'purple' | 'amber' | 'green'
  path: string
}

function WorkflowStep({ number, icon: Icon, title, description, color, path }: WorkflowStepProps) {
  const router = useRouter()

  const colorClasses = {
    blue: 'bg-blue-100 text-blue-700 border-blue-200 hover:border-blue-400 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800',
    purple: 'bg-purple-100 text-purple-700 border-purple-200 hover:border-purple-400 dark:bg-purple-950 dark:text-purple-300 dark:border-purple-800',
    amber: 'bg-amber-100 text-amber-700 border-amber-200 hover:border-amber-400 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800',
    green: 'bg-green-100 text-green-700 border-green-200 hover:border-green-400 dark:bg-green-950 dark:text-green-300 dark:border-green-800',
  }

  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -5 }}
      whileTap={{ scale: 0.95 }}
      onClick={() => router.push(path)}
      className={cn(
        'relative p-4 rounded-lg border-2 text-left transition-all cursor-pointer',
        colorClasses[color]
      )}
    >
      <div className="absolute -top-3 -left-3 h-8 w-8 rounded-full bg-background border-2 flex items-center justify-center font-bold text-sm">
        {number}
      </div>
      <Icon className="h-8 w-8 mb-3" />
      <h3 className="font-semibold text-sm mb-1">{title}</h3>
      <p className="text-xs opacity-80 line-clamp-2">{description}</p>
    </motion.button>
  )
}

interface DocLinkProps {
  title: string
  description: string
  href: string
}

function DocLink({ title, description, href }: DocLinkProps) {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push(href)}
      className="flex items-start gap-3 w-full p-3 rounded-lg hover:bg-accent transition-colors text-left group"
    >
      <ExternalLink className="h-4 w-4 mt-0.5 text-muted-foreground group-hover:text-primary transition-colors shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="font-medium text-sm line-clamp-1">{title}</div>
        <div className="text-xs text-muted-foreground line-clamp-1">{description}</div>
      </div>
      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
    </button>
  )
}

interface TipCardProps {
  title: string
  description: string
}

function TipCard({ title, description }: TipCardProps) {
  return (
    <div className="p-4 rounded-lg bg-background/50 border">
      <h4 className="font-semibold text-sm mb-2">{title}</h4>
      <p className="text-xs text-muted-foreground">{description}</p>
    </div>
  )
}
