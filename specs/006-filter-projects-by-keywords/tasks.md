# Tasks: Filter Projects by Keywords

**Input**: Design documents from `/specs/006-filter-projects-by-keywords/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)
- Include exact file paths in descriptions

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Add configuration for system-level keyword fallback

- [x] T001 [P] Add `project_filter_keywords` (PROJECT_FILTER_KEYWORDS env) to backend/app/config.py as optional comma-separated string

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Extend keyword matching to include skills_required before user story work

**⚠️ CRITICAL**: User story implementation builds on this

- [x] T002 [P] Extend `list_projects` in backend/app/services/project_service.py to include `skills_required` in the OR keyword clause—add `OR EXISTS (SELECT 1 FROM unnest(p.skills_required) AS s WHERE s ILIKE $n)` (or array_to_string equivalent) per keyword, alongside existing title/description ILIKE

---

## Phase 3: User Story 1 - Keyword-Filtered Project List (Priority: P1) 🎯 MVP

**Goal**: Projects list shows only projects matching at least one keyword (title, description, or skills). When `search` is omitted, use user's active keywords or system fallback.

**Independent Test**: Configure keywords at `/keywords`, load Projects page—only matching projects appear. Clear search input, filter still applies from user keywords.

### Implementation for User Story 1

- [x] T003 [US1] In backend/app/routers/projects.py `list_projects`, when `search` is None or blank: call `keyword_service.list_keywords(user_id, is_active=True)` and use `.keyword` values as filter terms; pass to `list_projects` service as `search` (comma-joined)

- [x] T004 [US1] In backend/app/routers/projects.py, when user has no active keywords, set filter from `settings.project_filter_keywords` (split by comma, trimmed); if still empty, pass None (show all) per FR-008

- [x] T005 [US1] Ensure HF fallback path in backend/app/routers/projects.py (when `USE_HF_DATASET` and not `etl_use_persistence`) uses same keyword resolution (user keywords → system → None) and passes to `fetch_hf_jobs(keyword_filter=...)` for local filtering

**Checkpoint**: User Story 1 complete—Projects page filters by keywords when none typed in search

---

## Phase 4: User Story 2 - Unchanged Scraping and ETL (Priority: P2)

**Goal**: ETL and scraping continue to ingest all projects; keyword filter applies only at list time.

**Independent Test**: Run ETL/discovery; verify all projects from source are stored. Change keywords; list updates without re-fetching.

### Implementation for User Story 2

- [x] T006 [P] [US2] Add comment in backend/app/etl/hf_loader.py and backend/scripts/freelancer_etl.py stating that keyword filtering is NOT applied during ingestion—filtering occurs only in project_service at list time (FR-004)

**Checkpoint**: User Story 2 verified—no keyword filter in ETL paths

---

## Phase 5: User Story 3 - Configurable Keywords (Priority: P3)

**Goal**: Users can add/remove keywords at `/keywords`; Projects list reflects changes on reload.

**Independent Test**: Add keyword, reload Projects—new matches appear. Remove keyword, reload—previous matches disappear.

### Implementation for User Story 3

- [ ] T007 [P] [US3] Optional: Prefill Projects page search input from user's active keywords on load in frontend/src/app/(dashboard)/projects/page.tsx so users see active filter terms (skipped—minimal UI preferred)

**Checkpoint**: User Story 3—keywords page already provides CRUD; T003/T004 ensure list uses them

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: Edge cases and verification

- [x] T008 [P] Ensure empty list shows clear message when keywords are configured but no projects match (check frontend/src/app/(dashboard)/projects/page.tsx EmptyState; update copy if needed per spec edge case)

- [x] T009 Run quickstart.md verification: add keywords, load projects, clear search, confirm filter; run ETL, confirm no filter applied during ingest

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: No dependencies—start immediately
- **Phase 2**: Depends on Phase 1 (config may be used)
- **Phase 3 (US1)**: Depends on Phase 2—needs skills in OR clause
- **Phase 4 (US2)**: No code changes—documentation only; can run after Phase 1
- **Phase 5 (US3)**: Satisfied by T003/T004; T007 is optional frontend
- **Phase 6**: After Phase 3–5

### User Story Dependencies

- **US1 (P1)**: Blocks UX—must complete first
- **US2 (P2)**: Independent—verification/documentation
- **US3 (P3)**: Largely satisfied by US1; T007 optional

### Parallel Opportunities

- T001 and T002 can run in parallel (different files)
- T006 (US2) can run in parallel with T003–T005 (different files)

---

## Parallel Example: User Story 1

```bash
# After T002 complete, these can proceed:
T003: "In projects router, when search is None or blank: resolve from user keywords"
T004: "In projects router, when user has no keywords: use settings.project_filter_keywords"
# T005 depends on T003/T004 resolution logic
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. T001 → T002 → T003 → T004 → T005
2. **STOP and VALIDATE**: Load Projects with keywords configured; verify filtering
3. Deploy/demo if ready

### Incremental Delivery

1. Phase 1 + 2 → Foundation ready
2. Phase 3 (US1) → Test filtering → MVP
3. Phase 4 (US2) → Document ETL unchanged
4. Phase 5 (US3) → Optional prefill
5. Phase 6 → Polish and verify

### Summary

| Phase | Tasks | Count |
|-------|-------|-------|
| Setup | T001 | 1 |
| Foundational | T002 | 1 |
| US1 - Keyword Filter | T003, T004, T005 | 3 |
| US2 - ETL Unchanged | T006 | 1 |
| US3 - Configurable | T007 | 1 (optional) |
| Polish | T008, T009 | 2 |
| **Total** | | **9** |
