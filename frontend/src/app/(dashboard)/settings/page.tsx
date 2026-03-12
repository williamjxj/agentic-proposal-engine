/**
 * Settings Page
 *
 * Manages user preferences and platform credentials.
 */

'use client'

import { useState } from 'react'
import { LoadingSkeleton } from '@/components/workflow/progress-overlay'
import {
  useCredentials,
  useDeleteCredential,
  useVerifyCredential,
} from '@/hooks/useSettings'
import { PreferencesForm } from '@/components/settings/preferences-form'
import { CredentialsList } from '@/components/settings/credentials-list'
import { CredentialForm } from '@/components/settings/credential-form'
import { PageHeader } from '@/components/shared/page-header'
import { PageContainer } from '@/components/shared/page-container'
import { useToast } from '@/lib/toast/toast-context'
import { Button } from '@/components/ui/button'
import { Key } from 'lucide-react'

export default function SettingsPage() {
  const toast = useToast()
  const [showCredentialForm, setShowCredentialForm] = useState(false)
  const [editingCredential, setEditingCredential] = useState<string | null>(null)

  const { data: credentials = [], isLoading, error, refetch } = useCredentials()
  const deleteCredentialMutation = useDeleteCredential()
  const verifyCredentialMutation = useVerifyCredential()

  const handleDelete = async (credentialId: string) => {
    if (confirm('Are you sure you want to delete this credential? This cannot be undone.')) {
      try {
        await deleteCredentialMutation.mutateAsync(credentialId)
      } catch (error) {
        console.error('Error deleting credential:', error)
      }
    }
  }

  const handleEdit = (credentialId: string) => {
    setEditingCredential(credentialId)
    setShowCredentialForm(true)
  }

  const handleCreate = () => {
    setEditingCredential(null)
    setShowCredentialForm(true)
  }

  const handleFormClose = () => {
    setShowCredentialForm(false)
    setEditingCredential(null)
  }

  const handleVerify = async (credentialId: string) => {
    try {
      const result = await verifyCredentialMutation.mutateAsync(credentialId)
      if (result?.is_valid) {
        toast.success('Credential verified successfully!')
      } else {
        toast.error(result?.error || 'Verification failed')
      }
    } catch (err) {
      console.error('Error verifying credential:', err)
      toast.error(err)
    }
  }

  if (isLoading) {
    return (
      <PageContainer>
        <PageHeader
          title="Settings"
          description="Manage your preferences and platform credentials"
        />
        <LoadingSkeleton lines={5} />
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-8">
      <PageHeader
        title="Settings"
        description="Manage your preferences and platform credentials"
      />

      {/* Preferences Section */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <PreferencesForm />
      </section>

      {/* Credentials Section */}
      <section className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Platform Credentials</h2>
          <Button onClick={handleCreate} className="flex items-center gap-1.5">
            <Key className="h-4 w-4" />
            Add Credential
          </Button>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
            <p>Error loading credentials: {error.message || 'Unknown error'}</p>
            <button
              onClick={() => refetch()}
              className="mt-2 text-red-600 underline dark:text-red-400"
            >
              Retry
            </button>
          </div>
        )}

        {/* Credentials List */}
        <CredentialsList
          credentials={credentials}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onVerify={handleVerify}
        />
      </section>

      {/* Credential Form Modal */}
      {showCredentialForm && (
        <CredentialForm
          credentialId={editingCredential}
          onClose={handleFormClose}
          onSuccess={() => {
            handleFormClose()
            refetch()
          }}
        />
      )}
    </PageContainer>
  )
}
