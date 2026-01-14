/**
 * useSettings Hook
 * 
 * React Query hooks for user settings management.
 */

'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  getSettings,
  updatePreferences,
  listCredentials,
  upsertCredential,
  deleteCredential,
  verifyCredential,
  getSubscription,
} from '@/lib/api/client'
import type {
  UserSettings,
  UserPreferences,
  PlatformCredential,
  CredentialUpsert,
  VerificationResult,
  SubscriptionInfo,
} from '@/types/settings'

/**
 * Query key factory for settings
 */
export const settingsKeys = {
  all: ['settings'] as const,
  settings: () => [...settingsKeys.all, 'user'] as const,
  credentials: () => [...settingsKeys.all, 'credentials'] as const,
  subscription: () => [...settingsKeys.all, 'subscription'] as const,
}

/**
 * Hook to get user settings
 */
export function useSettings() {
  return useQuery({
    queryKey: settingsKeys.settings(),
    queryFn: () => getSettings(),
  })
}

/**
 * Hook to get platform credentials
 */
export function useCredentials() {
  return useQuery({
    queryKey: settingsKeys.credentials(),
    queryFn: () => listCredentials(),
  })
}

/**
 * Hook to get subscription information
 */
export function useSubscription() {
  return useQuery({
    queryKey: settingsKeys.subscription(),
    queryFn: () => getSubscription(),
  })
}

/**
 * Hook to update user preferences
 */
export function useUpdatePreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (preferences: UserPreferences) => updatePreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.settings() })
    },
  })
}

/**
 * Hook to upsert platform credential
 */
export function useUpsertCredential() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (credential: CredentialUpsert) => upsertCredential(credential),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.credentials() })
      queryClient.invalidateQueries({ queryKey: settingsKeys.settings() })
    },
  })
}

/**
 * Hook to delete platform credential
 */
export function useDeleteCredential() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => deleteCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.credentials() })
      queryClient.invalidateQueries({ queryKey: settingsKeys.settings() })
    },
  })
}

/**
 * Hook to verify platform credential
 */
export function useVerifyCredential() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (id: string) => verifyCredential(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.credentials() })
      queryClient.invalidateQueries({ queryKey: settingsKeys.settings() })
    },
  })
}
