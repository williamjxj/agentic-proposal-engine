/**
 * API Client - HTTP Request Helper
 * Handles API requests with authentication headers and error handling
 */

import { createClient } from '@/lib/supabase/client'
import { errorFormatter } from '@/lib/errors/error-formatter'

interface RequestOptions extends RequestInit {
  body?: any
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  private async getAuthHeaders(): Promise<HeadersInit> {
    const supabase = createClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`
    }

    return headers
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<{ data: T | null; error: string | null }> {
    try {
      const headers = await this.getAuthHeaders()

      const trimmedEndpoint = endpoint.trim()
      if (!trimmedEndpoint) {
        throw new Error('API endpoint cannot be empty')
      }

      // Determine the final URL
      let finalUrl: string

      if (/^(https?:)?\/\//i.test(trimmedEndpoint)) {
        // It's an absolute URL, use it directly
        finalUrl = trimmedEndpoint
      } else {
        // It's a relative URL, resolve against the backend
        const backend = getBackendUrl()

        // Ensure backend doesn't have trailing slash and path doesn't have leading slash
        const cleanBackend = backend.replace(/\/+$/, '')
        const cleanPath = trimmedEndpoint.replace(/^\/+/, '')

        finalUrl = `${cleanBackend}/${cleanPath}`
      }

      // Final validation to prevent malformed URLs like /apihttp:/...
      if (!finalUrl.startsWith('http://') && !finalUrl.startsWith('https://')) {
        // If it starts with /api but isn't absolute, it might have been incorrectly prefixed
        if (finalUrl.startsWith('/api')) {
          const backend = getBackendUrl()
          finalUrl = `${backend.replace(/\/+$/, '')}/${finalUrl.replace(/^\/+/, '')}`
        } else {
          throw new Error(`Invalid API URL: ${finalUrl}. URL must be absolute.`)
        }
      }

      // Log the request in development
      if (process.env.NODE_ENV === 'development') {
        console.log(`[ApiClient] ${options.method || 'GET'} ${finalUrl}`)
      }

      const response = await fetch(finalUrl, {
        ...options,
        headers: {
          ...headers,
          ...options.headers,
        },
        body: options.body ? JSON.stringify(options.body) : undefined,
      })

      // Handle non-JSON responses (e.g., 404 from Next.js)
      let data: any
      const contentType = response.headers.get('content-type')
      if (contentType && contentType.includes('application/json')) {
        data = await response.json()
      } else {
        // For non-JSON responses (like 404), create a simple error object
        data = {
          error: `Request failed with status ${response.status}`,
          status: response.status,
        }
      }

      if (!response.ok) {
        // Create enhanced error object with response details
        const enhancedError = {
          status: response.status,
          response: { data, status: response.status },
          message: data.error || data.detail || `Request failed with status ${response.status}`,
          detail: data.detail,
        }

        // Format error for user-friendly display
        const formattedError = errorFormatter.format(enhancedError)

        return {
          data: null,
          error: formattedError.whatWentWrong,
        }
      }

      return { data, error: null }
    } catch (error) {
      // Format network/unexpected errors
      const formattedError = errorFormatter.format(error)

      return {
        data: null,
        error: formattedError.whatWentWrong,
      }
    }
  }

  async get<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'POST', body })
  }

  async patch<T>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body })
  }

  async put<T>(endpoint: string, body?: any, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body })
  }

  async delete<T>(endpoint: string, options?: RequestOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }

  /**
   * Get formatted error for display in toast/dialog
   */
  getFormattedError(error: any) {
    return errorFormatter.format(error)
  }
}

export const apiClient = new ApiClient()

// Workflow Optimization API Functions

import type {
  SessionState,
  SessionStateUpdate,
  DraftWork,
  DraftSaveRequest,
  OfflineChange,
  SyncBatchResponse,
  ConflictResolution,
  WorkflowAnalyticsEvent,
} from '@/types/workflow'

/**
 * Get backend API URL from environment
 * Returns a properly formatted absolute URL
 */
function getBackendUrl(): string {
  const url = process.env.NEXT_PUBLIC_BACKEND_API_URL || 'http://localhost:8000'

  // Normalize: remove trailing slashes and trim
  let cleanUrl = url.trim().replace(/\/+$/, '')

  // Ensure protocol
  if (!/^https?:\/\//i.test(cleanUrl)) {
    cleanUrl = `http://${cleanUrl.replace(/^\/+/, '')}`
  }

  return cleanUrl
}

/**
 * Construct an absolute API URL
 * Ensures the URL is always properly formatted and absolute
 */
function buildApiUrl(path: string): string {
  const backend = getBackendUrl()
  const cleanPath = path.replace(/^\/+/, '')
  return `${backend}/${cleanPath}`
}

/**
 * Session State API
 */
export async function getSessionState(): Promise<SessionState | null> {
  // Only run on client-side
  if (typeof window === 'undefined') {
    return null
  }

  const url = buildApiUrl('/api/session/state')
  const { data } = await apiClient.get<SessionState>(url)
  return data
}

export async function updateSessionState(
  state: SessionStateUpdate
): Promise<SessionState | null> {
  // Fix: Don't build URL if window is undefined (SSR)
  if (typeof window === 'undefined') {
    return null
  }

  const url = buildApiUrl('/api/session/state')
  const { data } = await apiClient.put<SessionState>(url, state)
  return data
}

export async function deleteSessionState(): Promise<void> {
  const backend = getBackendUrl()
  await apiClient.delete(`${backend}/api/session/state`)
}

/**
 * Draft API
 */
export async function listDrafts(): Promise<DraftWork[]> {
  const backend = getBackendUrl()
  const { data } = await apiClient.get<{ drafts: DraftWork[] }>(
    `${backend}/api/drafts`
  )
  return data?.drafts || []
}

export async function getDraft(
  entityType: string,
  entityId: string
): Promise<DraftWork | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.get<DraftWork>(
    `${backend}/api/drafts/${entityType}/${entityId}`
  )
  return data
}

export async function saveDraft(
  entityType: string,
  entityId: string,
  draftRequest: DraftSaveRequest
): Promise<DraftWork | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.put<DraftWork>(
    `${backend}/api/drafts/${entityType}/${entityId}`,
    draftRequest
  )
  return data
}

export async function discardDraft(
  entityType: string,
  entityId: string
): Promise<void> {
  const backend = getBackendUrl()
  await apiClient.delete(`${backend}/api/drafts/${entityType}/${entityId}`)
}

/**
 * Offline Sync API
 */
export async function syncOfflineQueue(
  changes: OfflineChange[]
): Promise<SyncBatchResponse | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.post<SyncBatchResponse>(
    `${backend}/api/sync/batch`,
    { changes }
  )
  return data
}

export async function resolveConflict(
  resolution: ConflictResolution
): Promise<void> {
  const backend = getBackendUrl()
  await apiClient.post(`${backend}/api/sync/resolve`, resolution)
}

/**
 * Analytics API
 */
export async function recordWorkflowEvent(
  event: WorkflowAnalyticsEvent
): Promise<void> {
  if (typeof window === 'undefined') {
    return
  }

  const url = buildApiUrl('/api/analytics/workflow-event')
  await apiClient.post(url, event)
}

// UI Routers Improvement API Functions

import type {
  Keyword,
  KeywordCreate,
  KeywordUpdate,
  KeywordFilters,
  KeywordStats,
} from '@/types/keywords'

import type {
  Strategy,
  StrategyCreate,
  StrategyUpdate,
  TestStrategyRequest,
  TestProposal,
} from '@/types/strategies'

import type {
  Document,
  DocumentFilters,
  DocumentStats,
} from '@/types/knowledge-base'

import type {
  UserSettings,
  UserPreferences,
  PlatformCredential,
  CredentialUpsert,
  VerificationResult,
  SubscriptionInfo,
} from '@/types/settings'

/**
 * Keywords API
 */
export async function listKeywords(
  filters?: KeywordFilters
): Promise<Keyword[]> {
  const backend = getBackendUrl()
  const params = new URLSearchParams()
  if (filters?.search) params.append('search', filters.search)
  if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active))
  if (filters?.match_type) params.append('match_type', filters.match_type)
  
  const query = params.toString()
  const url = query ? `${backend}/api/keywords?${query}` : `${backend}/api/keywords`
  const { data } = await apiClient.get<{ keywords: Keyword[] }>(url)
  return data?.keywords || []
}

export async function getKeyword(keywordId: string): Promise<Keyword | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.get<Keyword>(`${backend}/api/keywords/${keywordId}`)
  return data
}

export async function createKeyword(data: KeywordCreate): Promise<Keyword | null> {
  const backend = getBackendUrl()
  const { data: result } = await apiClient.post<Keyword>(`${backend}/api/keywords`, data)
  return result
}

export async function updateKeyword(
  keywordId: string,
  data: KeywordUpdate
): Promise<Keyword | null> {
  const backend = getBackendUrl()
  const { data: result } = await apiClient.patch<Keyword>(
    `${backend}/api/keywords/${keywordId}`,
    data
  )
  return result
}

export async function deleteKeyword(keywordId: string): Promise<void> {
  const backend = getBackendUrl()
  await apiClient.delete(`${backend}/api/keywords/${keywordId}`)
}

export async function getKeywordStats(keywordId: string): Promise<KeywordStats | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.get<KeywordStats>(
    `${backend}/api/keywords/${keywordId}/stats`
  )
  return data
}

/**
 * Strategies API
 */
export async function listStrategies(): Promise<Strategy[]> {
  const backend = getBackendUrl()
  const { data } = await apiClient.get<{ strategies: Strategy[] }>(`${backend}/api/strategies`)
  return data?.strategies || []
}

export async function getStrategy(strategyId: string): Promise<Strategy | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.get<Strategy>(`${backend}/api/strategies/${strategyId}`)
  return data
}

export async function createStrategy(data: StrategyCreate): Promise<Strategy | null> {
  const backend = getBackendUrl()
  const { data: result } = await apiClient.post<Strategy>(`${backend}/api/strategies`, data)
  return result
}

export async function updateStrategy(
  strategyId: string,
  data: StrategyUpdate
): Promise<Strategy | null> {
  const backend = getBackendUrl()
  const { data: result } = await apiClient.patch<Strategy>(
    `${backend}/api/strategies/${strategyId}`,
    data
  )
  return result
}

export async function deleteStrategy(strategyId: string): Promise<void> {
  const backend = getBackendUrl()
  await apiClient.delete(`${backend}/api/strategies/${strategyId}`)
}

export async function setDefaultStrategy(strategyId: string): Promise<void> {
  const backend = getBackendUrl()
  await apiClient.post(`${backend}/api/strategies/${strategyId}/set-default`)
}

export async function testStrategy(
  strategyId: string,
  request?: TestStrategyRequest
): Promise<TestProposal | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.post<TestProposal>(
    `${backend}/api/strategies/${strategyId}/test`,
    request || {}
  )
  return data
}

/**
 * Knowledge Base API
 */
export async function listDocuments(
  filters?: DocumentFilters
): Promise<Document[]> {
  const backend = getBackendUrl()
  const params = new URLSearchParams()
  if (filters?.collection) params.append('collection', filters.collection)
  if (filters?.processing_status) params.append('status', filters.processing_status)
  if (filters?.search) params.append('search', filters.search)
  
  const query = params.toString()
  const url = query ? `${backend}/api/documents?${query}` : `${backend}/api/documents`
  const { data } = await apiClient.get<Document[]>(url)
  return data || []
}

export async function getDocument(documentId: string): Promise<Document | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.get<Document>(
    `${backend}/api/documents/${documentId}`
  )
  return data
}

export async function uploadDocument(
  file: File,
  collection: string
): Promise<Document | null> {
  const backend = getBackendUrl()
  const formData = new FormData()
  formData.append('file', file)
  
  const queryParams = new URLSearchParams({ collection })
  const { data } = await apiClient.post<Document>(
    `${backend}/api/documents/upload?${queryParams.toString()}`,
    formData,
    {
      headers: {
        // Let browser set Content-Type with boundary for FormData
      },
    }
  )
  return data
}

export async function deleteDocument(documentId: string): Promise<void> {
  const backend = getBackendUrl()
  await apiClient.delete(`${backend}/api/documents/${documentId}`)
}

export async function reprocessDocument(documentId: string): Promise<Document | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.post<Document>(
    `${backend}/api/documents/${documentId}/reprocess`
  )
  return data
}

export async function getDocumentStats(documentId: string): Promise<DocumentStats | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.get<DocumentStats>(
    `${backend}/api/documents/${documentId}/stats`
  )
  return data
}

/**
 * Settings API
 */
export async function getSettings(): Promise<UserSettings | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.get<UserSettings>(`${backend}/api/settings`)
  return data
}

export async function updatePreferences(
  preferences: UserPreferences
): Promise<void> {
  const backend = getBackendUrl()
  await apiClient.put(`${backend}/api/settings/preferences`, preferences)
}

export async function listCredentials(): Promise<PlatformCredential[]> {
  const backend = getBackendUrl()
  const { data } = await apiClient.get<PlatformCredential[]>(
    `${backend}/api/settings/credentials`
  )
  return data || []
}

export async function upsertCredential(
  credential: CredentialUpsert
): Promise<PlatformCredential | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.post<PlatformCredential>(
    `${backend}/api/settings/credentials`,
    credential
  )
  return data
}

export async function deleteCredential(credentialId: string): Promise<void> {
  const backend = getBackendUrl()
  await apiClient.delete(`${backend}/api/settings/credentials/${credentialId}`)
}

export async function verifyCredential(
  credentialId: string
): Promise<VerificationResult | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.post<VerificationResult>(
    `${backend}/api/settings/credentials/${credentialId}/verify`
  )
  return data
}

export async function getSubscription(): Promise<SubscriptionInfo | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.get<SubscriptionInfo>(`${backend}/api/settings/subscription`)
  return data
}
