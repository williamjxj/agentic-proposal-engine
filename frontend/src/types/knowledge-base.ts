/**
 * Knowledge Base Type Definitions
 * 
 * Type definitions for knowledge base document management feature.
 */

export type DocumentFileType = 'pdf' | 'docx' | 'txt'

export type DocumentCollection = 'case_studies' | 'team_profiles' | 'portfolio' | 'other'

export type ProcessingStatus = 'pending' | 'processing' | 'completed' | 'failed'

export interface Document {
  id: string
  user_id: string
  filename: string
  file_type: DocumentFileType
  file_size_bytes: number
  file_url: string | null
  collection: DocumentCollection
  processing_status: ProcessingStatus
  processing_error: string | null
  chunk_count: number
  token_count: number
  retrieval_count: number
  last_retrieved_at: string | null
  uploaded_at: string
  processed_at: string | null
  created_at: string
  updated_at: string
}

export interface DocumentFilters {
  collection?: DocumentCollection
  processing_status?: ProcessingStatus
  search?: string
}

export interface DocumentStats {
  document_id: string
  retrieval_count: number
  last_retrieved_at: string | null
  chunk_count: number
  token_count: number
}
