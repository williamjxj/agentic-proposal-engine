/**
 * Proposal Types
 * 
 * Types for managing proposals with full lifecycle support.
 */

export interface Proposal {
  id: string
  user_id: string
  title: string
  description: string
  budget: string | null
  timeline: string | null
  skills: string[]
  
  // Job details
  job_url: string | null
  job_title: string | null
  client_name: string | null
  
  // AI-generated metadata
  ai_analysis: Record<string, unknown> | null
  strategy_used: string | null
  keywords_used: string[]
  
  // Status tracking
  status: 'draft' | 'submitted' | 'responded' | 'won' | 'lost' | 'archived'
  submitted_at: string | null
  response_received_at: string | null
  client_response: string | null
  
  // Timestamps
  created_at: string
  updated_at: string
}

export interface ProposalCreate {
  title: string
  description: string
  budget?: string | null
  timeline?: string | null
  skills?: string[]
  job_url?: string | null
  job_title?: string | null
  client_name?: string | null
  ai_analysis?: Record<string, unknown> | null
  strategy_used?: string | null
  keywords_used?: string[]
  status?: 'draft' | 'submitted' | 'responded' | 'won' | 'lost' | 'archived'
}

export interface ProposalUpdate {
  title?: string
  description?: string
  budget?: string | null
  timeline?: string | null
  skills?: string[]
  job_url?: string | null
  job_title?: string | null
  client_name?: string | null
  ai_analysis?: Record<string, unknown> | null
  strategy_used?: string | null
  keywords_used?: string[]
  status?: 'draft' | 'submitted' | 'responded' | 'won' | 'lost' | 'archived'
  submitted_at?: string | null
  response_received_at?: string | null
  client_response?: string | null
}

export interface ProposalListResponse {
  proposals: Proposal[]
  total: number
}
