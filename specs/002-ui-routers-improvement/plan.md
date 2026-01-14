# Implementation Plan: UI Routers Improvement

**Branch**: `002-ui-routers-improvement` | **Date**: January 12, 2026 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-ui-routers-improvement/spec.md`

## Summary

This feature implements four critical UI router pages that are currently missing but essential for the Auto-Bidder platform:

1. **Keywords Management** - CRUD interface for search keywords used in job discovery
2. **Bidding Strategies Management** - CRUD interface for AI prompt templates that control proposal generation
3. **Knowledge Base Management** - Document upload and management interface for RAG context
4. **Settings** - User preferences, platform credentials, and subscription management

**Technical Approach**: Build Next.js 15 App Router pages following existing patterns (Projects, Proposals, Analytics). Use TanStack Query for server state, session state hooks for filter preservation, and Supabase for data persistence. Backend adds FastAPI routers for CRUD operations, file upload handling, and document processing integration.

## Technical Context

**Language/Version**: 
- Frontend: TypeScript 5.3+ with Next.js 15.3+, React 19
- Backend: Python 3.12 with FastAPI 0.104+

**Primary Dependencies**:
- Frontend: Next.js, React Query (@tanstack/react-query), Supabase SSR, shadcn/ui, TailwindCSS
- Backend: FastAPI, Supabase Python client, Pydantic, PostgreSQL, ChromaDB (existing)
- File Upload: Supabase Storage or direct backend upload handling

**Storage**: 
- Primary: Supabase PostgreSQL (keywords, strategies, documents metadata, user settings)
- File Storage: Supabase Storage or backend filesystem (document files)
- Vector: ChromaDB (existing, for document embeddings)

**Testing**:
- Frontend: Jest + React Testing Library (existing setup)
- Backend: pytest (existing)
- E2E: Playwright (for critical user flows)

**Target Platform**: Web (Chrome, Firefox, Safari, Edge latest versions)

**Project Type**: Web application (Next.js frontend + FastAPI backend)

**Performance Goals**:
- Page load: <500ms (95th percentile) - SC-004
- Search/filter: <3 seconds response time - SC-005
- Document upload: <60 seconds processing for 95% of files - SC-003
- Form submission: <1 second for CRUD operations

**Constraints**:
- Must follow existing UI patterns (Projects, Proposals, Analytics pages)
- Must preserve filter state and scroll positions using session state hooks
- Document uploads limited to 50MB per file (FR-014)
- Supported file formats: PDF, DOCX, TXT only (FR-014)
- Only one default strategy per user (FR-009)
- Keywords must be unique per user (database constraint)

**Scale/Scope**:
- Expected users: 10-100 concurrent
- Keywords per user: 10-100 average
- Strategies per user: 5-20 average
- Documents per user: 10-50 average
- Document size: 1-10MB average, 50MB max

## Constitution Check

**Assumed Principles** (based on codebase analysis):
- ✅ **Type Safety**: TypeScript frontend, Python type hints with Pydantic
- ✅ **Testing**: pytest for backend, Jest for frontend
- ✅ **Database-First**: Using Supabase PostgreSQL with migrations
- ✅ **Modern Stack**: React 19, Next.js 15, FastAPI, Python 3.12
- ✅ **Consistent Patterns**: Following existing page implementations (Projects, Proposals, Analytics)

**Post-Design Re-Check**: Will verify after Phase 1 that data models follow existing patterns, API contracts align with FastAPI standards, and UI components match existing shadcn/ui patterns.

## Project Structure

### Documentation (this feature)

```text
specs/002-ui-routers-improvement/
├── plan.md              # This file
├── research.md          # Technology decisions and patterns (Phase 0)
├── data-model.md        # Database schema (existing tables, no new tables needed)
├── quickstart.md        # Developer setup guide (Phase 1)
├── contracts/          # API specifications (Phase 1)
│   ├── keywords-api.yaml
│   ├── strategies-api.yaml
│   ├── knowledge-base-api.yaml
│   └── settings-api.yaml
└── tasks.md             # Task breakdown (created by /speckit.tasks)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── main.py                # [MODIFY] Add new routers
│   ├── models/                # [NEW] Add keyword.py, strategy.py, document.py, settings.py
│   ├── routers/               # [NEW] Add keywords.py, strategies.py, knowledge_base.py, settings.py
│   ├── services/              # [NEW] Add keyword_service.py, strategy_service.py, document_service.py
│   │   ├── keyword_service.py      # [NEW] Keyword CRUD operations
│   │   ├── strategy_service.py     # [NEW] Strategy CRUD + default enforcement
│   │   ├── document_service.py     # [NEW] Document upload, processing status, deletion
│   │   └── settings_service.py     # [NEW] User preferences, credentials, subscription
│   └── core/
│       └── file_upload.py     # [NEW] File upload handling (if not using Supabase Storage)
├── tests/
│   ├── unit/
│   │   ├── test_keyword_service.py  # [NEW]
│   │   ├── test_strategy_service.py # [NEW]
│   │   ├── test_document_service.py # [NEW]
│   │   └── test_settings_service.py # [NEW]
│   └── integration/
│       └── test_ui_routers_api.py   # [NEW] End-to-end API tests
└── requirements.txt           # [MODIFY] Add file processing dependencies if needed

frontend/
├── src/
│   ├── app/(dashboard)/       # [NEW] Add four new pages
│   │   ├── keywords/
│   │   │   └── page.tsx       # [NEW] Keywords management page
│   │   ├── strategies/
│   │   │   └── page.tsx       # [NEW] Strategies management page
│   │   ├── knowledge-base/
│   │   │   └── page.tsx       # [NEW] Knowledge base management page
│   │   └── settings/
│   │       └── page.tsx       # [NEW] Settings page
│   ├── components/
│   │   ├── keywords/          # [NEW] Keyword-specific components
│   │   │   ├── keyword-form.tsx
│   │   │   ├── keyword-list.tsx
│   │   │   └── keyword-stats.tsx
│   │   ├── strategies/        # [NEW] Strategy-specific components
│   │   │   ├── strategy-form.tsx
│   │   │   ├── strategy-list.tsx
│   │   │   ├── strategy-preview.tsx
│   │   │   └── strategy-editor.tsx
│   │   ├── knowledge-base/    # [NEW] Knowledge base components
│   │   │   ├── document-upload.tsx
│   │   │   ├── document-list.tsx
│   │   │   ├── document-status.tsx
│   │   │   └── document-stats.tsx
│   │   └── settings/          # [NEW] Settings components
│   │       ├── settings-sections.tsx
│   │       ├── preferences-form.tsx
│   │       ├── credentials-form.tsx
│   │       └── subscription-card.tsx
│   ├── lib/
│   │   ├── api/
│   │   │   └── client.ts            # [MODIFY] Add new API functions
│   │   └── hooks/             # [NEW] Page-specific hooks
│   │       ├── useKeywords.ts
│   │       ├── useStrategies.ts
│   │       ├── useKnowledgeBase.ts
│   │       └── useSettings.ts
│   └── types/
│       ├── keywords.ts        # [NEW] Keyword type definitions
│       ├── strategies.ts      # [NEW] Strategy type definitions
│       ├── knowledge-base.ts  # [NEW] Document type definitions
│       └── settings.ts        # [NEW] Settings type definitions
├── tests/                     # [NEW] Frontend tests
│   ├── unit/
│   │   ├── keywords.test.tsx
│   │   ├── strategies.test.tsx
│   │   ├── knowledge-base.test.tsx
│   │   └── settings.test.tsx
│   └── e2e/
│       ├── keywords.spec.ts
│       ├── strategies.spec.ts
│       ├── knowledge-base.spec.ts
│       └── settings.spec.ts
└── package.json               # [MODIFY] Add file upload dependencies if needed

database/
├── migrations/
│   └── (No new migrations needed - tables already exist)
└── seed/
    └── (Optional: Add seed data for testing)
```

**Structure Decision**: Using existing web application structure with backend/frontend separation. New pages integrate into existing dashboard layout and extend API with new routers. Following established patterns: Supabase for data, FastAPI routers for API, React Query for server state caching, session state hooks for filter preservation.

## Complexity Tracking

> **No violations detected.** This feature builds upon existing architecture without introducing new structural complexity. Following established patterns throughout. All database tables already exist from previous migrations (003_biddinghub_merge.sql, 001_initial_schema.sql).

---

## Phase 0: Research & Technology Decisions

See [research.md](./research.md) for detailed findings.

**Key Decisions**:

1. **File Upload Strategy**: Supabase Storage with Direct Backend Processing ✅
   - Rationale: Supabase Storage provides built-in file management, CDN, and security. Backend can access files via Supabase Storage API for processing.
   - Alternatives considered: Direct backend upload, S3-compatible storage

2. **Document Processing Integration**: Asynchronous Processing with Status Polling ✅
   - Rationale: Document processing takes 10-60 seconds. Asynchronous processing allows immediate response. Status polling is simpler than WebSocket for MVP.
   - Alternatives considered: Synchronous processing, WebSocket/SSE, Celery queue

3. **Form Validation**: Zod schemas matching Pydantic models ✅
   - Rationale: Type-safe validation on frontend matching backend models. Existing codebase uses Zod.
   - Alternatives considered: Yup, Joi, manual validation

4. **Table/List Component**: shadcn/ui Table Component with Custom Enhancements ✅
   - Rationale: Consistent with existing UI patterns. Easy to customize. Can add virtual scrolling later if needed.
   - Alternatives considered: react-table, ag-grid, custom table

5. **File Upload UI**: Both Drag-and-Drop and File Picker ✅
   - Rationale: Drag-and-drop provides modern UX. File picker ensures accessibility. Supporting both maximizes usability.
   - Alternatives considered: File picker only, drag-and-drop only

**Status**: ✅ Phase 0 Complete - All clarifications resolved

---

## Phase 1: Data Model & API Contracts

See [data-model.md](./data-model.md) for complete schemas.

### Database Schema

**Existing Tables** (no new tables needed):

1. **keywords** - Already exists in `003_biddinghub_merge.sql`
   - Fields: id, user_id, keyword, description, is_active, match_type, jobs_matched, last_match_at, created_at, updated_at
   - Indexes: user_id, is_active, keyword (lowercase), unique(user_id, keyword)

2. **bidding_strategies** - Already exists in `001_initial_schema.sql`
   - Fields: id, user_id, name, description, system_prompt, tone, focus_areas, temperature, max_tokens, is_default, use_count, created_at, updated_at
   - Indexes: user_id, is_default, unique(user_id, name), unique(user_id, is_default) where is_default=true

3. **knowledge_base_documents** - Already exists in `003_biddinghub_merge.sql`
   - Fields: id, user_id, filename, file_type, file_size_bytes, file_url, collection, processing_status, processing_error, chunk_count, token_count, embedding_model, chroma_collection_name, retrieval_count, last_retrieved_at, uploaded_at, processed_at, created_at, updated_at
   - Indexes: user_id, collection, processing_status, uploaded_at

4. **user_profiles** - Already exists in `001_initial_schema.sql`
   - Fields: id, user_id, subscription_tier, subscription_status, subscription_expires_at, usage_quota, preferences, onboarding_completed, last_activity_at, created_at, updated_at
   - Indexes: user_id, subscription_tier, subscription_status

5. **platform_credentials** - Already exists in `003_biddinghub_merge.sql`
   - Fields: id, user_id, platform, api_key, api_secret, access_token, refresh_token, expires_at, is_active, last_verified_at, verification_error, created_at, updated_at
   - Indexes: user_id, platform, unique(user_id, platform)

### API Endpoints

See [contracts/](./contracts/) directory for OpenAPI specifications.

**New FastAPI Routers**:

1. **Keywords API** (`/api/keywords/*`)
   - GET `/api/keywords` - List user's keywords (with filters: search, is_active, match_type)
   - GET `/api/keywords/{keyword_id}` - Get specific keyword
   - POST `/api/keywords` - Create new keyword
   - PATCH `/api/keywords/{keyword_id}` - Update keyword
   - DELETE `/api/keywords/{keyword_id}` - Delete keyword
   - GET `/api/keywords/{keyword_id}/stats` - Get keyword statistics (jobs matched, last match)

2. **Strategies API** (`/api/strategies/*`)
   - GET `/api/strategies` - List user's strategies
   - GET `/api/strategies/{strategy_id}` - Get specific strategy
   - POST `/api/strategies` - Create new strategy
   - PATCH `/api/strategies/{strategy_id}` - Update strategy
   - DELETE `/api/strategies/{strategy_id}` - Delete strategy
   - POST `/api/strategies/{strategy_id}/set-default` - Set strategy as default
   - POST `/api/strategies/{strategy_id}/test` - Test strategy (generate sample proposal)

3. **Knowledge Base API** (`/api/knowledge-base/*`)
   - GET `/api/knowledge-base/documents` - List user's documents (with filters: collection, processing_status, search)
   - GET `/api/knowledge-base/documents/{document_id}` - Get specific document
   - POST `/api/knowledge-base/documents` - Upload new document (multipart/form-data)
   - DELETE `/api/knowledge-base/documents/{document_id}` - Delete document
   - POST `/api/knowledge-base/documents/{document_id}/reprocess` - Retry processing failed document
   - GET `/api/knowledge-base/documents/{document_id}/stats` - Get document statistics

4. **Settings API** (`/api/settings/*`)
   - GET `/api/settings` - Get user settings (profile, preferences, credentials, subscription)
   - PATCH `/api/settings/preferences` - Update user preferences
   - GET `/api/settings/credentials` - List platform credentials
   - POST `/api/settings/credentials` - Add/update platform credential
   - DELETE `/api/settings/credentials/{credential_id}` - Remove platform credential
   - POST `/api/settings/credentials/{credential_id}/verify` - Verify credential
   - GET `/api/settings/subscription` - Get subscription information

### Frontend API Client Updates

**New TypeScript API Functions** (in `lib/api/client.ts`):

```typescript
// Keywords
async function listKeywords(filters?: KeywordFilters): Promise<Keyword[]>
async function getKeyword(keywordId: string): Promise<Keyword>
async function createKeyword(data: KeywordCreate): Promise<Keyword>
async function updateKeyword(keywordId: string, data: KeywordUpdate): Promise<Keyword>
async function deleteKeyword(keywordId: string): Promise<void>
async function getKeywordStats(keywordId: string): Promise<KeywordStats>

// Strategies
async function listStrategies(): Promise<Strategy[]>
async function getStrategy(strategyId: string): Promise<Strategy>
async function createStrategy(data: StrategyCreate): Promise<Strategy>
async function updateStrategy(strategyId: string, data: StrategyUpdate): Promise<Strategy>
async function deleteStrategy(strategyId: string): Promise<void>
async function setDefaultStrategy(strategyId: string): Promise<void>
async function testStrategy(strategyId: string, sampleJob?: string): Promise<TestProposal>

// Knowledge Base
async function listDocuments(filters?: DocumentFilters): Promise<Document[]>
async function getDocument(documentId: string): Promise<Document>
async function uploadDocument(file: File, collection: string): Promise<Document>
async function deleteDocument(documentId: string): Promise<void>
async function reprocessDocument(documentId: string): Promise<void>
async function getDocumentStats(documentId: string): Promise<DocumentStats>

// Settings
async function getSettings(): Promise<UserSettings>
async function updatePreferences(preferences: UserPreferences): Promise<void>
async function listCredentials(): Promise<PlatformCredential[]>
async function upsertCredential(credential: CredentialUpsert): Promise<PlatformCredential>
async function deleteCredential(credentialId: string): Promise<void>
async function verifyCredential(credentialId: string): Promise<VerificationResult>
async function getSubscription(): Promise<SubscriptionInfo>
```

---

## Phase 2: Implementation Sequence

**NOTE**: Phase 2 task breakdown is created by `/speckit.tasks` command, not this plan.

**High-Level Implementation Order** (for context):

1. **Backend Foundation** (P1 - Week 1)
   - Keyword service + router
   - Strategy service + router
   - Document service + router (upload handling)
   - Settings service + router

2. **Frontend Foundation** (P1 - Week 1)
   - API client functions
   - React Query hooks (useKeywords, useStrategies, useKnowledgeBase, useSettings)
   - Type definitions

3. **Keywords Page** (P1 - Week 1)
   - Keywords list component
   - Keyword form (create/edit)
   - Search and filter functionality
   - Statistics display

4. **Strategies Page** (P1 - Week 2)
   - Strategies list component
   - Strategy form (create/edit) with prompt editor
   - Default strategy management
   - Strategy test/preview feature

5. **Knowledge Base Page** (P1 - Week 2)
   - Document list component
   - File upload component (drag-and-drop + file picker)
   - Processing status indicators
   - Document statistics

6. **Settings Page** (P2 - Week 2)
   - Settings sections layout
   - Preferences form
   - Platform credentials management
   - Subscription information display

7. **Integration & Polish** (Week 3)
   - Session state preservation (filters, scroll positions)
   - Error handling and loading states
   - Empty states
   - Accessibility improvements

8. **Testing & Documentation** (Week 3)
   - Unit tests (backend services, frontend components)
   - Integration tests (API endpoints)
   - E2E tests (critical user flows)
   - Documentation updates

---

## Integration Points

### Backend ↔ Database
- **Supabase Client**: Existing `app/services/supabase_client.py` extended with new CRUD operations
- **Database Tables**: All tables already exist (no new migrations needed)
- **RLS Policies**: Already configured in existing migrations
- **File Storage**: Supabase Storage or backend filesystem (decision needed in Phase 0)

### Backend ↔ Frontend
- **API Communication**: Frontend uses existing `lib/api/client.ts` pattern with new endpoints
- **Authentication**: Supabase JWT tokens passed in headers (existing pattern)
- **CORS**: Already configured in `backend/app/main.py` for localhost:3000
- **Error Format**: Follow existing FastAPI error response structure

### Frontend State Management
- **Server State**: React Query for caching API responses (existing pattern)
- **Form State**: React Hook Form with Zod validation (existing pattern)
- **Session State**: Existing `useSessionState` hook for filter/scroll preservation
- **File Upload**: FormData with progress tracking

### Document Processing Integration
- **Upload Flow**: Frontend → Backend API → Supabase Storage → Processing Service
- **Processing Status**: Polling or WebSocket for real-time updates (decision needed)
- **Vector Store**: ChromaDB integration via existing `vector_store.py` service

---

## Open Questions & Clarifications Needed

### Phase 0 Research Tasks

1. **File Upload Strategy**
   - Question: Should we use Supabase Storage or handle uploads directly in backend?
   - Research: Evaluate Supabase Storage capabilities, pricing, integration complexity
   - Decision needed before implementation

2. **Document Processing Architecture**
   - Question: Is document processing synchronous or asynchronous?
   - Research: Current document processing pipeline, ChromaDB integration, processing time
   - Decision needed for status polling vs WebSocket

3. **File Upload UX**
   - Question: Drag-and-drop, file picker, or both?
   - Research: UX best practices, user expectations, accessibility
   - Decision needed for component design

4. **Strategy Testing**
   - Question: How should strategy testing/preview work?
   - Research: Sample job data, proposal generation endpoint, preview UI
   - Decision needed for test feature implementation

5. **Platform Credential Verification**
   - Question: How do we verify Upwork/Freelancer credentials?
   - Research: Platform API documentation, OAuth flows, verification endpoints
   - Decision needed for credential management

---

## Success Criteria Validation

All success criteria from spec.md must be validated:

- **SC-001**: Keyword creation <30 seconds - Track with performance monitoring
- **SC-002**: Strategy creation <2 minutes - Track with performance monitoring
- **SC-003**: Document processing <60 seconds (95%) - Track processing times
- **SC-004**: Page load <500ms - Track with Web Vitals
- **SC-005**: Search/filter <3 seconds - Track API response times
- **SC-006**: 95% first-time success - Track via analytics
- **SC-007**: Zero data loss - Track via error monitoring
- **SC-008**: 4.0/5.0 satisfaction - User survey
- **SC-009**: Immediate settings updates - Functional test
- **SC-010**: 90% processing success - Track processing outcomes
- **SC-011**: State preservation - Functional test
- **SC-012**: 70% support ticket reduction - Track support metrics

---

**Plan Status**: ✅ Phase 0 & Phase 1 Complete  
**Phase 0**: ✅ Research completed - All technology decisions made  
**Phase 1**: ✅ Data model documented, API contracts created, quickstart guide written  
**Next Step**: Proceed to `/speckit.tasks` to create detailed task breakdown for implementation
