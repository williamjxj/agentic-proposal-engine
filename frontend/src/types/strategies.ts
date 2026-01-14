/**
 * Strategies Type Definitions
 * 
 * Type definitions for bidding strategy management feature.
 */

export type StrategyTone = 'professional' | 'enthusiastic' | 'technical' | 'friendly' | 'formal'

export interface Strategy {
  id: string
  user_id: string
  name: string
  description: string | null
  system_prompt: string
  tone: StrategyTone
  focus_areas: string[]
  temperature: number
  max_tokens: number
  is_default: boolean
  use_count: number
  created_at: string
  updated_at: string
}

export interface StrategyCreate {
  name: string
  description?: string | null
  system_prompt: string
  tone?: StrategyTone
  focus_areas?: string[]
  temperature?: number
  max_tokens?: number
  is_default?: boolean
}

export interface StrategyUpdate {
  name?: string
  description?: string | null
  system_prompt?: string
  tone?: StrategyTone
  focus_areas?: string[]
  temperature?: number
  max_tokens?: number
}

export interface TestStrategyRequest {
  job_description?: string
}

export interface TestProposal {
  proposal: string
  test_mode: boolean
}
