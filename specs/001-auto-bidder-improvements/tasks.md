# Tasks: Auto-Bidder Improvements

**Input**: Design documents from `/specs/001-auto-bidder-improvements/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Backend**: `backend/app/` (routers, services, models)
- **Frontend**: `frontend/src/` (app, components, lib)
- **Root**: `/Users/william.jiang/my-apps/auto-bidder/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Verify project is ready for implementation

- [x] T001 Verify environment and dependencies per specs/001-auto-bidder-improvements/quickstart.md (Docker, Python venv, Node, API keys)
- [x] T002 [P] Confirm backend routers and frontend API client structure in backend/app/main.py and frontend/src/lib/api/client.ts

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Fix infrastructure issues that block multiple user stories

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T003 Fix URL construction in frontend/src/lib/api/client.ts and getBackendUrl() to prevent malformed URLs (e.g. /apihttp:/localhost)
- [x] T004 Re-enable updateSessionState and recordWorkflowEvent in frontend/src/lib/workflow/session-context.tsx after T003
- [x] T005 Re-enable analytics API calls in frontend/src/hooks/useNavigationTiming.ts after T003

**Checkpoint**: Session and analytics APIs work; draft recovery can persist state

---

## Phase 3: User Story 1 - Higher-Quality, More Relevant Proposals (Priority: P1) 🎯 MVP

**Goal**: Proposals cite portfolio content, align with strategy, address job skills (FR-001, FR-002, FR-003). AI Generate button calls backend.

**Independent Test**: Upload doc → Discover job → Generate Proposal → Click AI Generate → Verify draft cites portfolio and matches strategy

### Implementation for User Story 1

- [x] T006 [P] [US1] Add portfolio and other (general_kb) to RAG collections list in backend/app/services/ai_service.py _retrieve_rag_context
- [x] T007 [US1] Map document collection "other" to ChromaDB "general_kb" in backend/app/services/document_service.py when storing chunks
- [x] T008 [US1] Add per-user asyncio.Lock in backend/app/services/ai_service.py for generate_proposal; return 429 with Retry-After when lock held (FR-010)
- [x] T009 [US1] Add citation overlap check in backend/app/services/ai_service.py: compare proposal to relevant_chunks; if chunks provided and no overlap, append hint (research.md §2)
- [x] T010 [US1] Strengthen system prompt in backend/app/services/ai_service.py _build_system_prompt to explicitly require citing portfolio and addressing job skills (FR-001, FR-003)
- [x] T011 [US1] Add generateProposalFromJob function to frontend/src/lib/api/client.ts calling POST /api/proposals/generate-from-job
- [x] T012 [US1] Replace handleAIGenerate placeholder in frontend/src/app/(dashboard)/proposals/new/page.tsx to call generateProposalFromJob and pre-fill form with response (research.md §7)
- [x] T013 [US1] Add loading state and error handling for AI Generate button in frontend/src/app/(dashboard)/proposals/new/page.tsx

**Checkpoint**: User Story 1 complete – AI Generate produces RAG-backed proposals; rapid requests return 429

---

## Phase 4: User Story 2 - More Reliable Draft Saving and Recovery (Priority: P2)

**Goal**: Auto-save works; draft recoverable after tab close; conflict resolution UI (FR-004, FR-005, FR-006).

**Independent Test**: Edit draft → wait for Saved → close tab → return → verify recovery; trigger conflict → verify conflict dialog

### Implementation for User Story 2

- [x] T014 [US2] Verify draft save returns 409 with conflict payload when version mismatch in backend/app/routers/draft.py (contracts/drafts-api.yaml)
- [x] T015 [US2] Ensure DraftRecoveryBanner and recoverDraft flow work in frontend/src/app/(dashboard)/proposals/new/page.tsx using session/draft APIs (T004)
- [x] T016 [US2] Add conflict resolution UI (keep local, keep server, or merge) when draft save returns 409 in frontend proposal editor
- [x] T017 [US2] Verify auto-save interval and draft_data persistence in frontend/src/hooks/useAutoSave.ts or equivalent

**Checkpoint**: User Story 2 complete – drafts recover; conflicts resolvable

---

## Phase 5: User Story 3 - Better Job Discovery and Matching (Priority: P3)

**Goal**: Jobs filtered/ranked by user keywords (FR-007, SC-005).

**Independent Test**: Set keywords → Discover jobs → verify majority match keywords

### Implementation for User Story 3

- [x] T018 [US3] Fetch user keywords in POST /api/projects/discover and pass to fetch_hf_jobs keyword_filter in backend/app/routers/projects.py
- [x] T019 [US3] Add keywords API to discover request in frontend/src/app/(dashboard)/projects/page.tsx: fetch listKeywords and include in discover payload
- [x] T020 [US3] Optionally pre-fill discover keywords from user keywords when opening discover dialog in frontend

**Checkpoint**: User Story 3 complete – discovered jobs match keywords

---

## Phase 6: User Story 4 - Smoother Knowledge Base Experience (Priority: P4)

**Goal**: Clear ingestion status and user-friendly errors (FR-008, FR-009).

**Independent Test**: Upload doc → see processing/ready; upload corrupt file → see actionable error

### Implementation for User Story 4

- [x] T021 [US4] Ensure processing_status and processing_error (or error_message) returned in GET /api/documents and GET /api/documents/{id} in backend/app/routers/knowledge_base.py
- [x] T022 [US4] Add error code mapping for ingestion failures in backend/app/services/document_service.py: ParseError → user-friendly message with suggestion (research.md §5)
- [x] T023 [US4] Display processing_status (pending, processing, ready, failed) in frontend knowledge base list in frontend/src/app/(dashboard)/knowledge-base/
- [x] T024 [US4] Display user-friendly error and suggestion when processing_status is failed in frontend document cards

**Checkpoint**: User Story 4 complete – document status visible; errors actionable

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Final validation and documentation

- [x] T025 [P] Update docs/antigravity-1.md or docs/PROPOSAL_WORKFLOW_INTEGRATION.md with AI Generate wiring completion status
- [x] T026 Run quickstart.md verification flow and fix any regressions

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies – start immediately
- **Foundational (Phase 2)**: Depends on Setup – BLOCKS all user stories
- **User Stories (Phase 3–6)**: Depend on Foundational completion
  - US1, US2, US3, US4 can proceed in parallel after Phase 2
  - Or sequentially in priority order (P1 → P2 → P3 → P4)
- **Polish (Phase 7)**: Depends on desired user stories complete

### User Story Dependencies

- **US1 (P1)**: After Phase 2 – No dependency on other stories
- **US2 (P2)**: After Phase 2 – Uses session/draft APIs (T004, T005)
- **US3 (P3)**: After Phase 2 – Independent
- **US4 (P4)**: After Phase 2 – Independent

### Within Each User Story

- T006, T007 [P] within US1 (different files)
- T011 before T012 (API client before page)
- T018 before T019 (backend before frontend)

### Parallel Opportunities

- **Phase 2**: T004 and T005 can run in parallel after T003
- **After Phase 2**: US1, US2, US3, US4 by different developers
- **US1**: T006, T007 [P]; T011 can start while T008–T010 in progress
- **US4**: T021, T022 [P] (backend); T023, T024 [P] (frontend) after backend

---

## Parallel Example: User Story 1

```bash
# Backend tasks (can interleave):
Task T006: Add portfolio/other to RAG in ai_service.py
Task T007: Map other→general_kb in document_service.py

# After T008–T010, frontend:
Task T011: Add generateProposalFromJob to client.ts
Task T012: Wire handleAIGenerate in proposals/new/page.tsx
Task T013: Loading/error UI for AI Generate
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (critical)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Test AI Generate with RAG
5. Demo for funding POC

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Add US1 → MVP demo (proposal quality)
3. Add US2 → Draft reliability
4. Add US3 → Job matching
5. Add US4 → KB UX
6. Each story independently testable

### Suggested MVP Scope

**User Story 1 only** (T001–T013): Delivers core value – higher-quality AI proposals with RAG citations and strategy alignment. Sufficient for POC/funding demonstration.

---

## Summary

| Phase | Tasks | Count |
|-------|-------|-------|
| Phase 1: Setup | T001–T002 | 2 |
| Phase 2: Foundational | T003–T005 | 3 |
| Phase 3: US1 (P1) | T006–T013 | 8 |
| Phase 4: US2 (P2) | T014–T017 | 4 |
| Phase 5: US3 (P3) | T018–T020 | 3 |
| Phase 6: US4 (P4) | T021–T024 | 4 |
| Phase 7: Polish | T025–T026 | 2 |
| **Total** | | **26** |

**Format validation**: All tasks use `- [ ] [TaskID] [P?] [Story?] Description with file path`
