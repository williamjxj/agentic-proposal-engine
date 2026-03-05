/**
 * Dashboard Page - Main Dashboard View
 * Overview of user's activity and quick stats
 */

import { PageHeader } from '@/components/shared/page-header'
import { PageContainer } from '@/components/shared/page-container'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function DashboardPage() {
  return (
    <PageContainer>
      <PageHeader
        title="Dashboard"
        description="Welcome to your Auto Bidder dashboard"
      />

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
            <span className="text-2xl">💼</span>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
            <p className="mt-1 text-xs text-muted-foreground">+0 from last week</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">Proposals Generated</p>
            <span className="text-2xl">📝</span>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0</p>
            <p className="mt-1 text-xs text-muted-foreground">0 / 10 this month</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">Win Rate</p>
            <span className="text-2xl">📈</span>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0%</p>
            <p className="mt-1 text-xs text-muted-foreground">No data yet</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <p className="text-sm font-medium text-muted-foreground">Time Saved</p>
            <span className="text-2xl">⏱️</span>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">0h</p>
            <p className="mt-1 text-xs text-muted-foreground">This month</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="text-lg font-semibold">Quick Start</h2>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <span className="text-2xl">1️⃣</span>
              <div>
                <p className="font-medium">Upload Knowledge Base Documents</p>
                <p className="text-sm text-muted-foreground">
                  Add your portfolio, case studies, and team profiles
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <span className="text-2xl">2️⃣</span>
              <div>
                <p className="font-medium">Configure Keywords</p>
                <p className="text-sm text-muted-foreground">
                  Set up keywords to filter relevant job postings
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4 rounded-lg border p-4">
              <span className="text-2xl">3️⃣</span>
              <div>
                <p className="font-medium">Generate Your First Proposal</p>
                <p className="text-sm text-muted-foreground">
                  Find a project and let AI create a customized proposal
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  )
}
