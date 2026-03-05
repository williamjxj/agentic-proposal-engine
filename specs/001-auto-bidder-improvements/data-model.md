# Data Model: Auto-Bidder Improvements

**Feature**: 001-auto-bidder-improvements
**Phase**: 1 - Design
**Date**: 2025-03-04

## Entity Summary

| Entity | Source | Changes |
|--------|--------|---------|
| Proposal / ProposalDraft | proposals, draft_work | No schema change; behavior changes (citation, strategy) |
| Job Listing / Project | projects (HF), projects table | Add persistence for discovered jobs (future) |
| Knowledge Base Document | knowledge_base_documents | processing_status, error_message exposure |
| Bidding Strategy | bidding_strategies | No change |
| Draft Work | draft_work | version for conflict resolution |

## 1. Proposal Draft (draft_work)

**Table**: `draft_work`

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK → users | |
| entity_type | varchar(50) | "proposal", "project", etc. | |
| entity_id | varchar(100) | nullable for new | |
| draft_data | JSONB | max 1MB | title, description, budget, skills, etc. |
| version | int | ge 1 | Conflict detection |
| created_at | timestamptz | | |
| updated_at | timestamptz | | |
| last_saved_at | timestamptz | | |

**State Transitions**:
- Create → version=1
- Save (no conflict) → version incremented
- Save (conflict) → return 409 with server_version, client_version

## 2. Knowledge Base Document

**Table**: `knowledge_base_documents`

| Field | Type | Validation | Notes |
|-------|------|------------|-------|
| id | UUID | PK | |
| user_id | UUID | FK | |
| filename | varchar(500) | | |
| file_type | varchar | pdf, docx, txt | |
| file_size_bytes | int | ge 0 | |
| collection | varchar | case_studies, team_profiles, portfolio, other | |
| processing_status | varchar | pending, processing, ready, failed | FR-008 |
| processing_error | text | nullable | FR-009: user-friendly message |
| chunk_count | int | ge 0 | |
| chroma_collection_name | varchar | nullable | Maps to ChromaDB |

**Collection Mapping (RAG)**:
- `case_studies` → ChromaDB `case_studies_{user_id}`
- `team_profiles` → `team_profiles_{user_id}`
- `portfolio` → `portfolio_{user_id}` (add to AIService search)
- `other` → `general_kb_{user_id}` (add to AIService search)

## 3. Generated Proposal (In-Memory / API Response)

**Model**: `GeneratedProposal`

| Field | Type | Notes |
|-------|------|-------|
| title | string | |
| description | string | Main content |
| budget | string? | |
| timeline | string? | |
| skills | string[] | |
| ai_model | string | |
| strategy_id | string? | |
| confidence_score | float | 0-1 |

**ProposalGenerateRequest**:

| Field | Type | Required |
|-------|------|----------|
| job_id | string? | |
| job_title | string | ✓ |
| job_description | string | ✓ |
| job_skills | string[] | |
| strategy_id | string? | |
| extra_context | string? | |
| custom_instructions | string? | |

## 4. Job Listing / Project (HuggingFace + Future DB)

**Current**: In-memory from HF dataset; normalized to `Project` model.

**Future** (projects table):

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK |
| external_id | varchar | HF/Upwork job ID |
| title | varchar | |
| description | text | |
| skills | text[] | |
| budget_min | decimal? | |
| budget_max | decimal? | |
| platform | varchar | hf_dataset, upwork, etc. |
| source_url | varchar? | |
| status | varchar | new, reviewed, applied |
| discovered_at | timestamptz | |

## 5. Bidding Strategy

**Table**: `bidding_strategies`

| Field | Type | Notes |
|-------|------|-------|
| id | UUID | PK |
| user_id | UUID | FK |
| name | varchar | |
| system_prompt | text | |
| tone | varchar | professional, technical, friendly |
| focus_areas | text[] | |
| is_default | bool | |

No schema changes for this feature.

## 6. Relationship Diagram

```
users
  ├── proposals
  ├── draft_work (entity_type=proposal)
  ├── knowledge_base_documents
  ├── bidding_strategies
  ├── keywords
  └── projects (future)

ChromaDB (per user):
  ├── case_studies_{user_id}
  ├── team_profiles_{user_id}
  ├── portfolio_{user_id}
  └── general_kb_{user_id}  (for "other" collection)
```
