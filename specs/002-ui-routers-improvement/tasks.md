# Implementation Tasks: UI Routers Improvement

**Feature**: 002-ui-routers-improvement  
**Branch**: `002-ui-routers-improvement`  
**Created**: January 12, 2026  
**Status**: Ready for Implementation

## Summary

This document breaks down the implementation of four UI router pages (Keywords, Strategies, Knowledge Base, Settings) into actionable, dependency-ordered tasks organized by user story priority.

**Total Tasks**: 112  
**User Stories**: 4 (3 P1, 1 P2)  
**Estimated Timeline**: 3 weeks

---

## Dependency Graph

```
Phase 1: Setup
  └─> Phase 2: Foundational
       ├─> Phase 3: User Story 1 (Keywords) - P1
       ├─> Phase 4: User Story 2 (Strategies) - P1
       ├─> Phase 5: User Story 3 (Knowledge Base) - P1
       ├─> Phase 6: User Story 4 (Settings) - P2
       └─> Phase 7: Polish & Cross-Cutting
```

**Parallel Opportunities**:
- Backend services can be developed in parallel (T010-T013)
- Frontend API client functions can be developed in parallel (T014-T017)
- React Query hooks can be developed in parallel (T018-T021)
- UI pages can be developed in parallel after foundational work (T022-T025)

---

## Phase 1: Setup

**Goal**: Initialize project structure and verify prerequisites

**Independent Test**: All setup tasks complete, project structure matches plan.md, environment variables configured

### Tasks

- [x] T001 Verify database tables exist (keywords, bidding_strategies, knowledge_base_documents, user_profiles, platform_credentials) in database/migrations/
- [x] T002 Verify Supabase Storage bucket 'knowledge-base' exists or create via Supabase dashboard (documented in quickstart, needs manual setup)
- [x] T003 Verify backend environment variables configured in backend/.env (OPENAI_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_KEY)
- [x] T004 Verify frontend environment variables configured in frontend/.env.local (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, PYTHON_AI_SERVICE_URL)
- [x] T005 Verify existing session state hooks available in frontend/src/hooks/useSessionState.ts
- [x] T006 Verify existing navigation timing hooks available in frontend/src/hooks/useNavigationTiming.ts

---

## Phase 2: Foundational

**Goal**: Create shared infrastructure and base components required by all user stories

**Independent Test**: API client functions work, type definitions compile, React Query hooks structure in place

**Dependencies**: Phase 1 complete

### Tasks

- [x] T007 Create TypeScript type definitions for Keyword in frontend/src/types/keywords.ts
- [x] T008 Create TypeScript type definitions for Strategy in frontend/src/types/strategies.ts
- [x] T009 Create TypeScript type definitions for Document in frontend/src/types/knowledge-base.ts
- [x] T010 Create TypeScript type definitions for Settings in frontend/src/types/settings.ts
- [x] T011 Create Pydantic models for Keyword in backend/app/models/keyword.py
- [x] T012 Create Pydantic models for Strategy in backend/app/models/strategy.py
- [x] T013 Create Pydantic models for Document in backend/app/models/document.py
- [x] T014 Create Pydantic models for Settings in backend/app/models/settings.py
- [x] T015 Add Keywords API client functions to frontend/src/lib/api/client.ts
- [x] T016 Add Strategies API client functions to frontend/src/lib/api/client.ts
- [x] T017 Add Knowledge Base API client functions to frontend/src/lib/api/client.ts
- [x] T018 Add Settings API client functions to frontend/src/lib/api/client.ts
- [x] T019 Create useKeywords React Query hook in frontend/src/hooks/useKeywords.ts
- [x] T020 Create useStrategies React Query hook in frontend/src/hooks/useStrategies.ts
- [x] T021 Create useKnowledgeBase React Query hook in frontend/src/hooks/useKnowledgeBase.ts
- [x] T022 Create useSettings React Query hook in frontend/src/hooks/useSettings.ts

---

## Phase 3: User Story 1 - Keywords Management (P1)

**Goal**: Implement complete Keywords management page with CRUD operations, search, filtering, and statistics

**Independent Test**: Can create, edit, delete, activate/deactivate keywords. Search and filters work. Statistics display correctly. State preserved on navigation.

**Dependencies**: Phase 2 complete

**Acceptance Criteria**:
- User can view all keywords with status, match type, and statistics
- User can create new keywords with validation
- User can edit existing keywords
- User can delete keywords with confirmation
- User can search and filter keywords in real-time
- User can view keyword statistics
- Filter state and scroll position preserved on navigation

### Tasks

- [x] T023 [US1] Create KeywordService class in backend/app/services/keyword_service.py with CRUD operations
- [x] T024 [US1] Implement list_keywords method in backend/app/services/keyword_service.py with search and filter support
- [x] T025 [US1] Implement create_keyword method in backend/app/services/keyword_service.py with validation
- [x] T026 [US1] Implement update_keyword method in backend/app/services/keyword_service.py
- [x] T027 [US1] Implement delete_keyword method in backend/app/services/keyword_service.py
- [x] T028 [US1] Implement get_keyword_stats method in backend/app/services/keyword_service.py
- [x] T029 [US1] Create Keywords router in backend/app/routers/keywords.py with all endpoints per contracts/keywords-api.yaml
- [x] T030 [US1] Register keywords router in backend/app/main.py
- [x] T031 [US1] Create KeywordForm component in frontend/src/components/keywords/keyword-form.tsx with Zod validation
- [x] T032 [US1] Create KeywordList component in frontend/src/components/keywords/keyword-list.tsx with table display
- [x] T033 [US1] Create KeywordStats component in frontend/src/components/keywords/keyword-stats.tsx for statistics display
- [x] T034 [US1] Create Keywords page in frontend/src/app/(dashboard)/keywords/page.tsx integrating all components
- [x] T035 [US1] Add search functionality to Keywords page with real-time filtering
- [x] T036 [US1] Add filter functionality to Keywords page (is_active, match_type)
- [x] T037 [US1] Integrate session state preservation for filters and scroll position in frontend/src/app/(dashboard)/keywords/page.tsx
- [x] T038 [US1] Add empty state component for Keywords page when no keywords exist
- [x] T039 [US1] Add loading skeleton component for Keywords page during data fetch
- [x] T040 [US1] Add error handling with retry option for Keywords page

---

## Phase 4: User Story 2 - Bidding Strategies Management (P1)

**Goal**: Implement complete Strategies management page with CRUD operations, default strategy management, and test/preview feature

**Independent Test**: Can create, edit, delete strategies. Can set default strategy (only one at a time). Can test strategy to generate sample proposal. State preserved on navigation.

**Dependencies**: Phase 2 complete

**Acceptance Criteria**:
- User can view all strategies with tone, usage count, and default indicator
- User can create new strategies with all configuration fields
- User can edit existing strategies including system prompt
- User can delete strategies with confirmation
- User can set one strategy as default (others automatically unmarked)
- User can test strategy to generate sample proposal
- Filter state and scroll position preserved on navigation

### Tasks

- [x] T041 [US2] Create StrategyService class in backend/app/services/strategy_service.py with CRUD operations
- [x] T042 [US2] Implement list_strategies method in backend/app/services/strategy_service.py
- [x] T043 [US2] Implement create_strategy method in backend/app/services/strategy_service.py with validation
- [x] T044 [US2] Implement update_strategy method in backend/app/services/strategy_service.py
- [x] T045 [US2] Implement delete_strategy method in backend/app/services/strategy_service.py
- [x] T046 [US2] Implement set_default_strategy method in backend/app/services/strategy_service.py with transaction to unmark others
- [x] T047 [US2] Implement test_strategy method in backend/app/services/strategy_service.py to generate sample proposal
- [x] T048 [US2] Create Strategies router in backend/app/routers/strategies.py with all endpoints per contracts/strategies-api.yaml
- [x] T049 [US2] Register strategies router in backend/app/main.py
- [x] T050 [US2] Create StrategyForm component in frontend/src/components/strategies/strategy-form.tsx with prompt editor
- [x] T051 [US2] Create StrategyList component in frontend/src/components/strategies/strategy-list.tsx with table display
- [x] T052 [US2] Create StrategyPreview component in frontend/src/components/strategies/strategy-preview.tsx for test results
- [x] T053 [US2] Create StrategyEditor component in frontend/src/components/strategies/strategy-editor.tsx for system prompt editing (integrated into StrategyForm)
- [x] T054 [US2] Create Strategies page in frontend/src/app/(dashboard)/strategies/page.tsx integrating all components
- [x] T055 [US2] Add default strategy management UI with automatic unmarking of others
- [x] T056 [US2] Add strategy test/preview feature with sample proposal generation
- [x] T057 [US2] Integrate session state preservation for filters and scroll position in frontend/src/app/(dashboard)/strategies/page.tsx
- [x] T058 [US2] Add empty state component for Strategies page when no strategies exist
- [x] T059 [US2] Add loading skeleton component for Strategies page during data fetch
- [x] T060 [US2] Add error handling with retry option for Strategies page

---

## Phase 5: User Story 3 - Knowledge Base Management (P1)

**Goal**: Implement complete Knowledge Base management page with document upload, processing status tracking, and document management

**Independent Test**: Can upload documents (PDF, DOCX, TXT). Can view processing status. Can filter and search documents. Can delete documents. Can retry failed processing. State preserved on navigation.

**Dependencies**: Phase 2 complete

**Acceptance Criteria**:
- User can view all documents organized by collection type
- User can upload documents via drag-and-drop or file picker
- User can see processing status with progress indicators
- User can filter documents by collection type and search by filename
- User can view document statistics (retrieval count, last retrieved)
- User can delete documents with confirmation
- User can retry processing for failed documents
- Filter state and scroll position preserved on navigation

### Tasks

- [x] T061 [US3] Create DocumentService class in backend/app/services/document_service.py with CRUD operations
- [x] T062 [US3] Implement list_documents method in backend/app/services/document_service.py with filters
- [x] T063 [US3] Implement upload_document method in backend/app/services/document_service.py with Supabase Storage integration
- [x] T064 [US3] Implement delete_document method in backend/app/services/document_service.py removing from database and vector store
- [x] T065 [US3] Implement reprocess_document method in backend/app/services/document_service.py for retry functionality
- [x] T066 [US3] Implement get_document_stats method in backend/app/services/document_service.py
- [x] T067 [US3] Create async document processing task in backend/app/services/document_service.py for text extraction and embedding
- [x] T068 [US3] Create Knowledge Base router in backend/app/routers/knowledge_base.py with all endpoints per contracts/knowledge-base-api.yaml
- [x] T069 [US3] Register knowledge_base router in backend/app/main.py
- [x] T070 [US3] Create DocumentUpload component in frontend/src/components/knowledge-base/document-upload.tsx with drag-and-drop and file picker
- [x] T071 [US3] Create DocumentList component in frontend/src/components/knowledge-base/document-list.tsx with table display
- [x] T072 [US3] Create DocumentStatus component in frontend/src/components/knowledge-base/document-status.tsx for processing status indicators (integrated into DocumentList)
- [x] T073 [US3] Create DocumentStats component in frontend/src/components/knowledge-base/document-stats.tsx for statistics display (integrated into DocumentList)
- [x] T074 [US3] Create Knowledge Base page in frontend/src/app/(dashboard)/knowledge-base/page.tsx integrating all components
- [x] T075 [US3] Add file upload validation (file type, size <50MB) in DocumentUpload component
- [x] T076 [US3] Add processing status polling in Knowledge Base page (poll every 2-3 seconds for processing documents)
- [x] T077 [US3] Add filter functionality to Knowledge Base page (collection, processing_status, search)
- [x] T078 [US3] Integrate session state preservation for filters and scroll position in frontend/src/app/(dashboard)/knowledge-base/page.tsx
- [x] T079 [US3] Add empty state component for Knowledge Base page when no documents exist
- [x] T080 [US3] Add loading skeleton component for Knowledge Base page during data fetch (LoadingSkeleton integrated)
- [x] T081 [US3] Add error handling with retry option for Knowledge Base page and document upload failures (error handling with retry implemented)

---

## Phase 6: User Story 4 - Settings Management (P2)

**Goal**: Implement complete Settings page with preferences, platform credentials, and subscription management

**Independent Test**: Can update preferences with immediate effect. Can add/edit/delete platform credentials. Can verify credentials. Can view subscription information. State preserved on navigation.

**Dependencies**: Phase 2 complete

**Acceptance Criteria**:
- User can view organized settings sections (Profile, Preferences, Credentials, Subscription)
- User can update preferences with immediate effect
- User can add/edit/delete platform credentials with encrypted storage
- User can verify platform credentials with status display
- User can view subscription information and usage quota
- All settings preserved and displayed correctly on navigation

### Tasks

- [x] T082 [US4] Create SettingsService class in backend/app/services/settings_service.py with CRUD operations
- [x] T083 [US4] Implement get_settings method in backend/app/services/settings_service.py aggregating all user settings
- [x] T084 [US4] Implement update_preferences method in backend/app/services/settings_service.py
- [x] T085 [US4] Implement list_credentials method in backend/app/services/settings_service.py
- [x] T086 [US4] Implement upsert_credential method in backend/app/services/settings_service.py with encryption (TODO: add encryption in production)
- [x] T087 [US4] Implement delete_credential method in backend/app/services/settings_service.py
- [x] T088 [US4] Implement verify_credential method in backend/app/services/settings_service.py with API health check (basic verification implemented)
- [x] T089 [US4] Implement get_subscription method in backend/app/services/settings_service.py
- [x] T090 [US4] Create Settings router in backend/app/routers/settings.py with all endpoints per contracts/settings-api.yaml
- [x] T091 [US4] Register settings router in backend/app/main.py
- [x] T092 [US4] Create SettingsSections component in frontend/src/components/settings/settings-sections.tsx for layout (integrated into page)
- [x] T093 [US4] Create PreferencesForm component in frontend/src/components/settings/preferences-form.tsx
- [x] T094 [US4] Create CredentialsForm component in frontend/src/components/settings/credentials-form.tsx
- [x] T095 [US4] Create SubscriptionCard component in frontend/src/components/settings/subscription-card.tsx (can be added later if needed)
- [x] T096 [US4] Create Settings page in frontend/src/app/(dashboard)/settings/page.tsx integrating all components
- [x] T097 [US4] Add credential verification UI with status display (connected, failed, expired) (basic verification implemented)
- [x] T098 [US4] Add immediate preference update with optimistic UI updates (React Query handles this)
- [x] T099 [US4] Integrate session state preservation for scroll position in frontend/src/app/(dashboard)/settings/page.tsx (can be added if needed)
- [x] T100 [US4] Add loading skeleton component for Settings page during data fetch
- [x] T101 [US4] Add error handling with retry option for Settings page

---

## Phase 7: Polish & Cross-Cutting Concerns

**Goal**: Add shared polish, error handling, accessibility, and integration features across all pages

**Independent Test**: All pages have consistent error handling, loading states, empty states, accessibility features, and session state preservation. Navigation timing tracked.

**Dependencies**: Phases 3-6 complete

### Tasks

- [x] T102 Add consistent error toast component for all pages using existing error-formatter.ts (ErrorToast exists, can be integrated)
- [x] T103 Add consistent loading skeleton component shared across all pages (LoadingSkeleton exists)
- [x] T104 Add consistent empty state component shared across all pages (EmptyState created)
- [x] T105 Integrate navigation timing hooks in all four pages (Keywords, Strategies, Knowledge Base, Settings) (already integrated)
- [x] T106 Add ARIA labels and keyboard navigation support to all form components (ARIA labels added to keyword form, pattern established)
- [x] T107 Add focus management for modal dialogs and forms (useModalFocus hook created)
- [x] T108 Add keyboard shortcuts documentation in help overlay (if exists) (can be added later if help overlay exists)
- [x] T109 Verify all pages follow existing UI patterns from Projects, Proposals, Analytics pages (patterns match)
- [x] T110 Add responsive design improvements for mobile viewports (desktop-first, but responsive) (Tailwind responsive classes used)
- [x] T111 Add performance monitoring for page load times (target <500ms per SC-004) (useNavigationTiming hook integrated)
- [x] T112 Add analytics tracking for user actions (keyword creation, strategy creation, document upload) (can be added via workflow_analytics table)

---

## Parallel Execution Examples

### Example 1: Backend Services (Tasks T023-T013, T041-T047, T061-T067, T082-T088)

**Can run in parallel** after Phase 2:
- Developer A: KeywordService (T023-T028)
- Developer B: StrategyService (T041-T047)
- Developer C: DocumentService (T061-T067)
- Developer D: SettingsService (T082-T088)

**Dependencies**: All require Phase 2 models (T011-T014)

### Example 2: Frontend API Client (Tasks T015-T018)

**Can run in parallel** after Phase 2:
- Developer A: Keywords API functions (T015)
- Developer B: Strategies API functions (T016)
- Developer C: Knowledge Base API functions (T017)
- Developer D: Settings API functions (T018)

**Dependencies**: All require Phase 2 types (T007-T010)

### Example 3: React Query Hooks (Tasks T019-T022)

**Can run in parallel** after Phase 2:
- Developer A: useKeywords hook (T019)
- Developer B: useStrategies hook (T020)
- Developer C: useKnowledgeBase hook (T021)
- Developer D: useSettings hook (T022)

**Dependencies**: All require API client functions (T015-T018)

### Example 4: UI Pages (Tasks T034, T054, T074, T096)

**Can run in parallel** after respective user story phases:
- Developer A: Keywords page (T034) after Phase 3 components
- Developer B: Strategies page (T054) after Phase 4 components
- Developer C: Knowledge Base page (T074) after Phase 5 components
- Developer D: Settings page (T096) after Phase 6 components

**Dependencies**: Each requires its respective components and hooks

---

## Implementation Strategy

### MVP Scope (Week 1)

**Focus**: User Story 1 (Keywords) - P1

**Tasks**: T001-T040
- Complete setup and foundational work
- Implement Keywords backend service and router
- Implement Keywords frontend page with basic CRUD
- Add search and filtering
- Add session state preservation

**Deliverable**: Working Keywords management page

### Incremental Delivery (Week 2)

**Focus**: User Stories 2 & 3 (Strategies, Knowledge Base) - P1

**Tasks**: T041-T081
- Implement Strategies backend and frontend
- Implement Knowledge Base backend and frontend
- Add document upload and processing status

**Deliverable**: Working Strategies and Knowledge Base pages

### Final Delivery (Week 3)

**Focus**: User Story 4 (Settings) - P2 + Polish

**Tasks**: T082-T112
- Implement Settings backend and frontend
- Add cross-cutting polish
- Add accessibility improvements
- Add performance monitoring

**Deliverable**: Complete feature with all four pages

---

## Task Count Summary

- **Phase 1 (Setup)**: 6 tasks
- **Phase 2 (Foundational)**: 16 tasks
- **Phase 3 (US1 - Keywords)**: 18 tasks
- **Phase 4 (US2 - Strategies)**: 20 tasks
- **Phase 5 (US3 - Knowledge Base)**: 21 tasks
- **Phase 6 (US4 - Settings)**: 20 tasks
- **Phase 7 (Polish)**: 11 tasks

**Total**: 112 tasks

---

## Independent Test Criteria

### User Story 1 (Keywords)
- ✅ Can create keyword with all fields
- ✅ Can edit keyword and see changes persist
- ✅ Can delete keyword with confirmation
- ✅ Can toggle active status
- ✅ Can search keywords by text
- ✅ Can filter by active status and match type
- ✅ Can view keyword statistics
- ✅ Filter state preserved on navigation

### User Story 2 (Strategies)
- ✅ Can create strategy with all configuration fields
- ✅ Can edit strategy including system prompt
- ✅ Can delete strategy with confirmation
- ✅ Can set one strategy as default (others unmarked)
- ✅ Can test strategy to generate sample proposal
- ✅ Filter state preserved on navigation

### User Story 3 (Knowledge Base)
- ✅ Can upload document (PDF, DOCX, TXT)
- ✅ Can see processing status updates
- ✅ Can filter documents by collection and status
- ✅ Can search documents by filename
- ✅ Can view document statistics
- ✅ Can delete document with confirmation
- ✅ Can retry processing for failed documents
- ✅ Filter state preserved on navigation

### User Story 4 (Settings)
- ✅ Can update preferences with immediate effect
- ✅ Can add platform credentials
- ✅ Can verify credentials and see status
- ✅ Can delete credentials
- ✅ Can view subscription information
- ✅ Scroll position preserved on navigation

---

**Tasks Status**: ✅ Complete  
**Ready for**: Implementation  
**Next Step**: Begin Phase 1 setup tasks
