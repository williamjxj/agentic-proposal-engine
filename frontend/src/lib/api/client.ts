/**
 * API Client - HTTP Request Helper
 * Handles API requests with authentication headers and error handling
 */

import { errorFormatter } from '@/lib/errors/error-formatter'

const TOKEN_KEY = 'auth_token'

interface RequestOptions extends RequestInit {
  body?: any
}

class ApiClient {
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl
  }

  private getAuthHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
    }

    // Get token from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(TOKEN_KEY)
      if (token) {
        headers['Authorization'] = `Bearer ${token}`
      }
    }

    return headers
  }

  private async request<T>(
    endpoint: string,
    options: RequestOptions = {}
  ): Promise<{ data: T | null; error: string | null }> {
    try {
      const headers = this.getAuthHeaders()

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

      // Prepare the body - don't stringify FormData
      let body: any = undefined
      if (options.body) {
        if (options.body instanceof FormData) {
          // Send FormData as-is (browser will set proper Content-Type with boundary)
          body = options.body
        } else {
          // Stringify non-FormData bodies (JSON)
          body = JSON.stringify(options.body)
        }
      }

      // Prepare headers - don't set Content-Type for FormData
      const finalHeaders: HeadersInit = { ...headers, ...options.headers }
      if (options.body instanceof FormData && 'Content-Type' in finalHeaders) {
        delete (finalHeaders as any)['Content-Type']
      }

      const response = await fetch(finalUrl, {
        ...options,
        headers: finalHeaders,
        body,
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
        // 401: clear session and redirect to login so user can re-authenticate
        if (response.status === 401 && typeof window !== 'undefined') {
          localStorage.removeItem(TOKEN_KEY)
          document.cookie = 'auth_token=; path=/; max-age=0'
          const redirect = encodeURIComponent(window.location.pathname)
          window.location.href = `/login?redirect=${redirect}`
          return { data: null, error: 'Session expired' }
        }

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
  draftRequest: { draft_data: Record<string, unknown>; version: number }
): Promise<DraftWork | null> {
  const backend = getBackendUrl()
  const { data, error } = await apiClient.put<DraftWork>(
    `${backend}/api/drafts/${entityType}/${entityId}`,
    draftRequest
  )
  if (error) {
    // Handle error properly - ensure it's always a string
    let msg = 'Failed to save draft'
    try {
      if (typeof error === 'string') {
        msg = error
      } else if (error && typeof error === 'object') {
        if ('message' in error && typeof error.message === 'string') {
          msg = error.message
        } else if ('toString' in error && typeof error.toString === 'function') {
          const str = error.toString()
          msg = typeof str === 'string' ? str : JSON.stringify(error)
        } else {
          msg = JSON.stringify(error)
        }
      } else if (error != null) {
        msg = String(error)
      }
    } catch (e) {
      // If anything fails, use the default message
      msg = 'Failed to save draft: ' + String(error)
    }
    throw new Error(msg)
  }
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

export interface ProposalAnalytics {
  proposal_trends: { date: string; count: number; submitted: number }[]
  acceptance_over_time: { date: string; accepted: number; total: number; rate: number }[]
  revenue_over_time: { period: string; revenue: number }[]
  platform_performance: { platform: string; count: number; accepted: number; rate: number }[]
}

const EMPTY_ANALYTICS: ProposalAnalytics = {
  proposal_trends: [],
  acceptance_over_time: [],
  revenue_over_time: [],
  platform_performance: [],
}

export async function getProposalAnalytics(
  timeRange: string = '7d'
): Promise<ProposalAnalytics> {
  const backend = getBackendUrl()
  const { data, error } = await apiClient.get<ProposalAnalytics>(
    `${backend}/api/analytics/proposals-stats?time_range=${encodeURIComponent(timeRange)}`
  )
  if (error) throw new Error(error)
  return data ?? EMPTY_ANALYTICS
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
  const { data, error } = await apiClient.get<{ keywords: Keyword[] }>(url)

  if (error) {
    throw new Error(error)
  }

  return data?.keywords || []
}

export async function getKeyword(keywordId: string): Promise<Keyword | null> {
  const backend = getBackendUrl()
  const { data, error } = await apiClient.get<Keyword>(`${backend}/api/keywords/${keywordId}`)

  if (error) {
    throw new Error(error)
  }

  return data
}

export async function createKeyword(data: KeywordCreate): Promise<Keyword | null> {
  const backend = getBackendUrl()
  const { data: result, error } = await apiClient.post<Keyword>(`${backend}/api/keywords`, data)

  if (error) {
    throw new Error(error)
  }

  return result
}

export async function updateKeyword(
  keywordId: string,
  data: KeywordUpdate
): Promise<Keyword | null> {
  const backend = getBackendUrl()
  const { data: result, error } = await apiClient.patch<Keyword>(
    `${backend}/api/keywords/${keywordId}`,
    data
  )

  if (error) {
    throw new Error(error)
  }

  return result
}

export async function deleteKeyword(keywordId: string): Promise<void> {
  const backend = getBackendUrl()
  const { error } = await apiClient.delete(`${backend}/api/keywords/${keywordId}`)

  if (error) {
    throw new Error(error)
  }
}

export async function getKeywordStats(keywordId: string): Promise<KeywordStats | null> {
  const backend = getBackendUrl()
  const { data, error } = await apiClient.get<KeywordStats>(
    `${backend}/api/keywords/${keywordId}/stats`
  )

  if (error) {
    throw new Error(error)
  }

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
  collection: string,
  options?: {
    title?: string
    supplemental_info?: string
    reference_url?: string
    email?: string
    phone?: string
    contact_url?: string
  }
): Promise<Document | null> {
  const backend = getBackendUrl()
  const formData = new FormData()
  formData.append('file', file)

  const queryParams = new URLSearchParams({ collection })

  // Add optional fields to query params if provided
  if (options?.title) {
    queryParams.append('title', options.title)
  }
  if (options?.supplemental_info) {
    queryParams.append('supplemental_info', options.supplemental_info)
  }
  if (options?.reference_url) {
    queryParams.append('reference_url', options.reference_url)
  }
  if (options?.email) {
    queryParams.append('email', options.email)
  }
  if (options?.phone) {
    queryParams.append('phone', options.phone)
  }
  if (options?.contact_url) {
    queryParams.append('contact_url', options.contact_url)
  }

  const { data } = await apiClient.post<Document>(
    `${backend}/api/documents/upload?${queryParams.toString()}`,
    formData
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

/**
 * Proposals API
 */
export async function listProposals(
  status?: string,
  limit?: number,
  offset?: number
): Promise<{ proposals: any[]; total: number }> {
  const backend = getBackendUrl()
  const params = new URLSearchParams()
  if (status) params.append('status', status)
  if (limit) params.append('limit', limit.toString())
  if (offset) params.append('offset', offset.toString())

  const url = `${backend}/api/proposals${params.toString() ? '?' + params.toString() : ''}`
  const { data } = await apiClient.get<{ proposals: any[]; total: number }>(url)
  return data || { proposals: [], total: 0 }
}

/**
 * Get job ids for which the user has a draft or submitted proposal.
 * Used to prevent repeat applications on the Projects page.
 */
export async function getAppliedJobIds(): Promise<string[]> {
  const backend = getBackendUrl()
  const { data } = await apiClient.get<{ job_ids: string[] }>(
    `${backend}/api/proposals/applied-ids`
  )
  return data?.job_ids ?? []
}

export async function getProposal(proposalId: string): Promise<any | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.get<any>(`${backend}/api/proposals/${proposalId}`)
  return data
}

export async function createProposal(proposalData: any): Promise<any | null> {
  const backend = getBackendUrl()
  const { data, error } = await apiClient.post<any>(
    `${backend}/api/proposals`,
    proposalData
  )
  if (error) throw new Error(error)
  return data
}

export async function submitProposalFromDraft(
  entityType: string,
  entityId: string
): Promise<any | null> {
  const backend = getBackendUrl()
  const { data, error } = await apiClient.post<any>(
    `${backend}/api/proposals/from-draft/${entityType}/${entityId}`
  )
  if (error) throw new Error(error)
  return data
}

export async function updateProposal(
  proposalId: string,
  proposalData: any
): Promise<any | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.put<any>(
    `${backend}/api/proposals/${proposalId}`,
    proposalData
  )
  return data
}

export async function deleteProposal(proposalId: string): Promise<void> {
  const backend = getBackendUrl()
  await apiClient.delete(`${backend}/api/proposals/${proposalId}`)
}

export interface ProposalGenerateRequest {
  job_id?: string
  job_title: string
  job_description: string
  job_company?: string
  job_skills?: string[]
  job_model_response?: string  // Structured job analysis (Core Responsibilities, Required Skills, etc.)
  strategy_id?: string
  /** Knowledge base collections to use for RAG (case_studies, team_profiles, portfolio, other). Omit = all. */
  collections?: string[]
  extra_context?: string
  custom_instructions?: string
}

export interface GeneratedProposal {
  title: string
  description: string
  budget?: string
  timeline?: string
  skills?: string[]
  ai_model?: string
  strategy_id?: string
}

export type ProposalStreamEvent =
  | { type: 'meta'; model?: string; strategy_id?: string }
  | { type: 'token'; token: string }
  | { type: 'done'; result?: GeneratedProposal }
  | { type: 'error'; error: string }

export async function generateProposalFromJob(
  request: ProposalGenerateRequest
): Promise<GeneratedProposal | null> {
  const backend = getBackendUrl()
  const { data, error } = await apiClient.post<GeneratedProposal>(
    `${backend}/api/proposals/generate-from-job`,
    request
  )
  if (error) throw new Error(error)
  return data
}

export async function streamProposalFromJob(
  request: ProposalGenerateRequest,
  onEvent: (event: ProposalStreamEvent) => void
): Promise<void> {
  const backend = getBackendUrl()
  const token =
    typeof window !== 'undefined' ? localStorage.getItem(TOKEN_KEY) : null

  const response = await fetch(`${backend}/api/proposals/generate-from-job/stream`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(request),
  })

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const errorBody = await response.json()
      message = errorBody.detail || errorBody.error || message
    } catch {
      // Keep fallback message when response is not JSON.
    }
    throw new Error(message)
  }

  if (!response.body) {
    throw new Error('Streaming response body is missing.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const events = buffer.split('\n\n')
    buffer = events.pop() || ''

    for (const eventChunk of events) {
      const dataLine = eventChunk
        .split('\n')
        .find((line) => line.startsWith('data: '))
      if (!dataLine) continue

      const payload = dataLine.slice(6)
      try {
        const parsed = JSON.parse(payload) as ProposalStreamEvent
        onEvent(parsed)
      } catch {
        // Ignore malformed chunks and continue stream processing.
      }
    }
  }
}

// ============================================================================
// PROJECTS API - HuggingFace Job Discovery
// ============================================================================

export interface ProjectDiscoverRequest {
  keywords: string[]
  platforms?: string[]
  max_results?: number
  dataset_id?: string
}

export interface ProjectFilters {
  search?: string
  skills?: string[]
  min_budget?: number
  max_budget?: number
  platforms?: string[]
  category?: string
  start_date?: string
  end_date?: string
  applied?: boolean
  sort_by?: string
}

export interface ProjectListResponse {
  jobs: Project[]
  total: number
  page: number
  pages: number
  limit: number
  source: string
  dataset_id?: string
}

export interface Project {
  id: string
  title: string
  description: string
  company: string
  location?: string
  platform: string
  url?: string
  posted_date?: string
  deadline?: string
  budget?: {
    min: number
    max: number
    currency: string
  }
  skills: string[]
  requirements?: string[]
  discovered_at: string
  status?: string
  test_email?: string
  model_response?: string  // Structured job analysis (Core Responsibilities, Required Skills, etc.)
}

export interface ProjectDiscoverResponse {
  jobs: Project[]
  total: number
  dataset_used: string
  keywords_searched: string[]
}

export interface ProjectStats {
  total_jobs?: number
  /** Records scraped/looked at (before keyword filter) */
  total_data?: number
  /** Records matching keyword filter (displayed) */
  total_opportunities?: number
  by_platform?: Record<string, number>
  by_skill?: Record<string, number>
  avg_budget?: number
  /** Keywords used for filter (from keywords table or PROJECT_FILTER_KEYWORDS) */
  filter_keywords?: string | null
  /** Primary data source (e.g. HuggingFace) */
  data_source?: string | null
}

export interface DatasetInfo {
  id: string
  name: string
  description: string
  size: string
  fields: string[]
  recommended: boolean
}

/**
 * Discover new jobs from HuggingFace datasets
 */
export async function discoverProjects(
  request: ProjectDiscoverRequest
): Promise<ProjectDiscoverResponse | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.post<ProjectDiscoverResponse>(
    `${backend}/api/projects/discover`,
    request
  )
  return data
}

/**
 * List jobs with optional filters
 */
export async function listProjects(
  filters?: ProjectFilters,
  limit: number = 50,
  offset: number = 0
): Promise<ProjectListResponse | null> {
  const backend = getBackendUrl()
  const params = new URLSearchParams()
  params.append('limit', String(limit))
  params.append('offset', String(offset))

  if (filters?.search) params.append('search', filters.search)
  if (filters?.min_budget) params.append('min_budget', String(filters.min_budget))
  if (filters?.max_budget) params.append('max_budget', String(filters.max_budget))
  if (filters?.platforms && filters.platforms.length > 0) {
    // API expects multiple platforms as repeated params or handled by router?
    // Current router handles single platform. We'll send first for now or handle all.
    params.append('platform', filters.platforms[0])
  }
  if (filters?.category) params.append('category', filters.category)
  if (filters?.start_date) params.append('start_date', filters.start_date)
  if (filters?.end_date) params.append('end_date', filters.end_date)
  if (filters?.applied !== undefined) params.append('applied', String(filters.applied))
  if (filters?.sort_by) params.append('sort_by', filters.sort_by)

  const { data } = await apiClient.get<ProjectListResponse>(
    `${backend}/api/projects/list?${params.toString()}`
  )
  return data
}

/**
 * Chat with projects dataset
 */
export async function chatWithProjects(query: string): Promise<{ response: string } | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.post<{ response: string }>(
    `${backend}/api/projects/chat?query=${encodeURIComponent(query)}`
  )
  return data
}

/**
 * Get project statistics
 */
export async function getProjectStats(): Promise<ProjectStats | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.get<ProjectStats>(`${backend}/api/projects/stats`)
  return data
}

export async function createManualProject(projectData: any): Promise<Project | null> {
  const backend = getBackendUrl()
  const { data, error } = await apiClient.post<Project>(
    `${backend}/api/projects/manual`,
    projectData
  )
  if (error) throw new Error(error)
  return data
}

/**
 * Get available HuggingFace datasets
 */
export async function getAvailableDatasets(): Promise<DatasetInfo[]> {
  const backend = getBackendUrl()
  // The backend returns { "datasets": [...], "current": "...", "mode": "..." }
  // We extract the datasets array to prevent .map() errors in the UI.
  const { data } = await apiClient.get<{ datasets: DatasetInfo[] }>(`${backend}/api/projects/datasets`)
  return data?.datasets || []
}

/**
 * Get single project by ID
 */
export async function getProject(projectId: string): Promise<Project | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.get<Project>(`${backend}/api/projects/${projectId}`)
  return data
}

/**
 * Update project status (interested, applied, rejected, etc.)
 */
export async function updateProjectStatus(
  projectId: string,
  status: string
): Promise<Project | null> {
  const backend = getBackendUrl()
  const { data } = await apiClient.put<Project>(
    `${backend}/api/projects/${projectId}/status`,
    { status }
  )
  return data
}
