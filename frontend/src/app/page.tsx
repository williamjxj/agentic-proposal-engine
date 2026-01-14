/**
 * Home Page - Landing Page
 * Public landing page with CTA to login/signup
 */

import Link from 'next/link'
import Image from 'next/image'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <main className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <div className="flex flex-col items-center gap-4 text-center">
          <Image
            src="/logo.svg"
            alt="Auto Bidder"
            width={200}
            height={48}
            className="h-12 w-auto sm:h-16"
            priority
          />
          <h1 className="sr-only text-5xl font-bold tracking-tight sm:text-6xl lg:text-7xl">
            Auto Bidder
          </h1>
          <p className="max-w-2xl text-xl text-muted-foreground">
            AI-Powered Proposal Generation Platform
          </p>
          <p className="max-w-3xl text-lg text-muted-foreground">
            Reduce proposal writing time from 30 minutes to 2 minutes with automated job discovery,
            RAG-based knowledge retrieval, and AI proposal generation.
          </p>
        </div>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-8 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-8 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground"
          >
            Sign In
          </Link>
        </div>

        <div className="grid max-w-5xl grid-cols-1 gap-8 sm:grid-cols-3">
          <div className="flex flex-col gap-2 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <h3 className="text-lg font-semibold">Automated Discovery</h3>
            <p className="text-sm text-muted-foreground">
              Scrape and collect relevant freelance jobs from multiple platforms automatically.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <h3 className="text-lg font-semibold">Knowledge Base</h3>
            <p className="text-sm text-muted-foreground">
              Upload portfolio documents for AI to reference when generating proposals.
            </p>
          </div>
          <div className="flex flex-col gap-2 rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
            <h3 className="text-lg font-semibold">AI Generation</h3>
            <p className="text-sm text-muted-foreground">
              Generate personalized, evidence-based proposals in under 60 seconds.
            </p>
          </div>
        </div>
      </main>

      <footer className="container flex flex-col items-center gap-4 px-4 py-8 text-center text-sm text-muted-foreground">
        <p>Built with Next.js, React, FastAPI, and OpenAI</p>
      </footer>
    </div>
  )
}
