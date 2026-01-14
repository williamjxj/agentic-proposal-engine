/**
 * Settings Type Definitions
 * 
 * Type definitions for user settings management feature.
 */

export type SubscriptionTier = 'free' | 'pro' | 'agency'

export type SubscriptionStatus = 'active' | 'cancelled' | 'expired'

export type Platform = 'upwork' | 'freelancer' | 'custom'

export type Theme = 'system' | 'light' | 'dark'

export interface UserProfile {
  user_id: string
  subscription_tier: SubscriptionTier
  subscription_status: SubscriptionStatus
}

export interface UserPreferences {
  default_strategy_id: string | null
  notification_email: boolean
  notification_browser: boolean
  theme: Theme
  language: string
}

export interface PlatformCredential {
  id: string
  user_id: string
  platform: Platform
  is_active: boolean
  last_verified_at: string | null
  verification_error: string | null
  expires_at: string | null
}

export interface CredentialUpsert {
  platform: Platform
  api_key?: string
  api_secret?: string
  access_token?: string
  refresh_token?: string
}

export interface VerificationResult {
  is_valid: boolean
  verified_at: string
  error?: string | null
}

export interface UsageQuota {
  proposals_generated: number
  proposals_limit: number
  period_start: string | null
}

export interface SubscriptionInfo {
  tier: SubscriptionTier
  status: SubscriptionStatus
  expires_at: string | null
  usage_quota: UsageQuota
}

export interface UserSettings {
  profile: UserProfile
  preferences: UserPreferences
  credentials: PlatformCredential[]
  subscription: SubscriptionInfo
}
