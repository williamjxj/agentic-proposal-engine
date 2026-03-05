/**
 * Credentials List Component
 * 
 * Displays a list of platform credentials with actions.
 */

'use client'

import type { PlatformCredential } from '@/types/settings'

interface CredentialsListProps {
  credentials: PlatformCredential[]
  onEdit: (credentialId: string) => void
  onDelete: (credentialId: string) => void
  onVerify: (credentialId: string) => void
}

export function CredentialsList({
  credentials,
  onEdit,
  onDelete,
  onVerify,
}: CredentialsListProps) {
  if (credentials.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
        <p className="text-muted-foreground">No credentials found</p>
        <p className="text-sm text-muted-foreground mt-2">
          Add platform credentials to enable integrations
        </p>
      </div>
    )
  }

  return (
    <div className="grid gap-4">
      {credentials.map((credential) => (
        <div
          key={credential.id}
          className="rounded-lg border border-slate-200 p-4 hover:border-primary hover:shadow-md transition-all dark:border-slate-800 dark:hover:border-primary"
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold capitalize">{credential.platform}</h3>
                {credential.is_active ? (
                  <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    Active
                  </span>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                    Inactive
                  </span>
                )}
                {credential.last_verified_at && (
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                    Verified
                  </span>
                )}
              </div>
              <div className="mt-2 text-sm text-muted-foreground">
                <p>API credentials configured</p>
                {credential.last_verified_at && (
                  <p className="mt-1">Verified: {new Date(credential.last_verified_at).toLocaleDateString()}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 ml-4">
              <button
                onClick={() => onVerify(credential.id)}
                className="rounded-md border border-blue-300 px-3 py-1.5 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-900/20"
              >
                Verify
              </button>
              <button
                onClick={() => onEdit(credential.id)}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(credential.id)}
                className="rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
