/**
 * Keywords Type Definitions
 * 
 * Type definitions for keyword management feature.
 */

export type MatchType = 'exact' | 'partial' | 'fuzzy'

export interface Keyword {
  id: string
  user_id: string
  keyword: string
  description: string | null
  is_active: boolean
  match_type: MatchType
  jobs_matched: number
  last_match_at: string | null
  created_at: string
  updated_at: string
}

export interface KeywordCreate {
  keyword: string
  description?: string | null
  match_type?: MatchType
  is_active?: boolean
}

export interface KeywordUpdate {
  keyword?: string
  description?: string | null
  match_type?: MatchType
  is_active?: boolean
}

export interface KeywordFilters {
  search?: string
  is_active?: boolean
  match_type?: MatchType
}

export interface KeywordStats {
  keyword_id: string
  jobs_matched: number
  last_match_at: string | null
}
