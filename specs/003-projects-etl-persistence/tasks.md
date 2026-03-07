# Tasks: Projects ETL Persistence

**Input**: Design documents from `/specs/003-projects-etl-persistence/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/
**Reference**: `docs/todos/autobidder-etl-rag-schema-spec.md`

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story (US1, US2, US3, US4)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and ETL module structure

- [x] T001 Create backend/app/etl/ directory with __init__.py per plan.md structure
- [x] T002 Add ETL_USE_PERSISTENCE, HF_ETL_SCHEDULE_HOURS to backend/.env.example
- [x] T003 [P] Add apscheduler to backend dependencies (pyproject.toml or requirements.txt)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story. No user story work can begin until this phase is complete.

**⚠️ CRITICAL**: All user stories depend on this phase

- [ ] T004 Create database/migrations/007_jobs_etl_runs.sql with jobs, etl_runs, user_job_status tables and enums per data-model.md and autobidder-etl-rag-schema-spec Section 4.2
- [ ] T005 [P] Implement domain_filter.py in backend/app/etl/domain_filter.py with passes_domain_filter() and ALLOWED_DOMAINS per autobidder-etl-rag-schema-spec Section 1.1
- [ ] T006 [P] Create Job, ETLRun, UserJobStatus Pydantic/SQLAlchemy models in backend/app/models/job.py per data-model.md
- [ ] T007 Implement job_service in backend/app/services/job_service.py with upsert_jobs(), list_jobs(), get_stats() using fingerprint_hash deduplication
- [ ] T008 Implement hf_loader in backend/app/etl/hf_loader.py: load HF dataset, apply domain filter, normalize to JobRecord schema, return list for upsert
- [ ] T009 Implement run_hf_ingestion() in backend/app/etl/hf_loader.py that calls hf_loader, job_service.upsert_jobs, and records etl_runs
- [ ] T010 Add job_service and hf_loader to backend app startup; ensure database session available for ETL

**Checkpoint**: Foundation ready — jobs table exists, domain filter works, job_service can upsert and read. Run manual ingestion to seed data.

---

## Phase 3: User Story 1 - Fast Projects Page Load (Priority: P1) 🎯 MVP

**Goal**: Projects page loads from database in under 3 seconds; search and filter respond in under 2 seconds.

**Independent Test**: Open /projects with seeded jobs; verify list loads < 3s; apply search/filter; verify results < 2s; navigate away and back; data loads from DB (no external fetch).

- [ ] T011 [US1] Modify list_projects in backend/app/routers/projects.py to read from job_service.list_jobs when ETL_USE_PERSISTENCE=true
- [ ] T012 [US1] Modify get_project_stats in backend/app/routers/projects.py to read from job_service.get_stats when ETL_USE_PERSISTENCE=true
- [ ] T013 [US1] Implement full-text search and filters (keywords, platform, category, sort_by) in job_service.list_jobs per contracts/projects-api.yaml
- [ ] T014 [US1] Map jobs table rows to API response shape (id, title, description, company, skills, budget, platform, posted_at, source) in projects router
- [ ] T015 [US1] Add pagination (limit, offset) to list_jobs and ensure response includes total, page, pages per contracts

**Checkpoint**: User Story 1 complete. Projects page loads fast from DB. Search and filter work.

---

## Phase 4: User Story 2 - Scheduled Job Ingestion (Priority: P2)

**Goal**: System ingests jobs from HuggingFace on a schedule; domain filter applied; duplicates upserted; etl_runs logged.

**Independent Test**: Trigger ingestion; verify new jobs in Projects list; verify domain-irrelevant jobs excluded; re-run ingestion; verify no duplicates; verify etl_runs has record.

- [ ] T016 [US2] Implement APScheduler setup in backend/app/etl/scheduler.py with AsyncIOScheduler per autobidder-etl-rag-schema-spec Section 2.4
- [ ] T017 [US2] Add weekly HF ingestion job to scheduler (IntervalTrigger weeks=1) calling run_hf_ingestion
- [ ] T018 [US2] Register scheduler with FastAPI lifespan (start on startup, shutdown on shutdown)
- [ ] T019 [US2] Implement GET /api/etl/runs in backend/app/routers/ (or new etl router) to list etl_runs per contracts
- [ ] T020 [US2] Implement POST /api/etl/trigger to run manual ingestion (returns 202, runs async or sync)
- [ ] T021 [US2] Add error handling and etl_runs status=failed with error_message when ingestion fails

**Checkpoint**: User Story 2 complete. Scheduled ingestion runs; manual trigger works; etl_runs audited.

---

## Phase 5: User Story 3 - Job Status Tracking (Priority: P3)

**Goal**: Users mark jobs as reviewed/applied; status persists; filter by status works.

**Independent Test**: Mark job as reviewed; return to list; status persists; filter "only applied"; only applied jobs shown; mark outcome won/lost; persists.

- [ ] T022 [US3] Implement user_job_status upsert in backend/app/services/job_service.py (set_user_job_status)
- [ ] T023 [US3] Implement PUT /api/projects/{project_id}/status in backend/app/routers/projects.py to update user_job_status per contracts
- [ ] T024 [US3] Extend list_jobs to join user_job_status for current user and include status in response
- [ ] T025 [US3] Add applied/reviewed filter to list_jobs when user filters by status
- [ ] T026 [US3] Support status values: new, reviewed, applied, won, lost, archived in user_job_status and API

**Checkpoint**: User Story 3 complete. Status tracking works; filter by status works.

---

## Phase 6: User Story 4 - Discover and Persist New Jobs (Priority: P4)

**Goal**: Discover flow fetches from HF, applies domain filter, upserts to jobs, returns results; subsequent page loads show persisted jobs.

**Independent Test**: Discover with keywords; jobs appear; open Projects page; same jobs appear without re-fetch; Discover again with same keywords; no duplicates.

- [ ] T027 [US4] Modify POST /api/projects/discover in backend/app/routers/projects.py to call hf_loader with keywords, then job_service.upsert_jobs, then return jobs from DB
- [ ] T028 [US4] Ensure Discover uses same domain filter and deduplication (fingerprint_hash) as scheduled ingestion
- [ ] T029 [US4] Return discovered jobs in same API shape as list; set source=dataset_used in response
- [ ] T030 [US4] Handle Discover when ETL_USE_PERSISTENCE=true; fallback to current HF-only behavior when false for backward compat

**Checkpoint**: User Story 4 complete. Discover persists; no duplicates; backward compat preserved.

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Proposals linkage, cleanup, validation

- [ ] T031 Add nullable job_id column to proposals table via migration; update proposal creation to accept job_id when creating from Projects page
- [ ] T032 [P] Update quickstart.md with actual paths and verify steps work
- [ ] T033 Add ETL_USE_PERSISTENCE check to projects router so list/stats/discover use DB when true, else current HF behavior
- [ ] T034 [P] Add unit test for domain_filter.passes_domain_filter in backend/tests/unit/etl/test_domain_filter.py
- [ ] T035 [P] Add integration test for list_projects returning from DB in backend/tests/integration/test_projects_api.py
- [ ] T036 Run quickstart.md validation: migration, ingestion, Projects page load, Discover, status update

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — start immediately
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **US1 (Phase 3)**: Depends on Foundational — MVP
- **US2 (Phase 4)**: Depends on Foundational — can run parallel to US1 after Foundational
- **US3 (Phase 5)**: Depends on US1 (needs list from DB) — can start after US1
- **US4 (Phase 6)**: Depends on Foundational — can run parallel to US1/US2
- **Polish (Phase 7)**: Depends on all user stories complete

### User Story Dependencies

| Story | Depends On | Can Parallel With |
|-------|------------|-------------------|
| US1 | Foundational | — |
| US2 | Foundational | US1, US4 |
| US3 | US1 | US2, US4 |
| US4 | Foundational | US1, US2 |

### Within Each Phase

- Migration before models
- Models before services
- Services before routers
- Domain filter before hf_loader
- hf_loader before job_service integration

### Parallel Opportunities

- T005, T006 can run in parallel (domain_filter, models)
- US2 and US4 can be implemented in parallel after Foundational
- T034, T035 can run in parallel in Polish phase

---

## Parallel Example: Foundational Phase

```bash
# After T004 (migration) complete:
# Parallel: domain filter + models
Task T005: "Implement domain_filter.py in backend/app/etl/domain_filter.py"
Task T006: "Create Job, ETLRun, UserJobStatus models in backend/app/models/job.py"

# Then sequential: T007 (job_service), T008 (hf_loader), T009 (run_hf_ingestion)
```

---

## Parallel Example: User Story 1

```bash
# After Foundational complete:
# T011, T012 can be done together (same file, list + stats)
# T013, T014, T015 are sequential (list_jobs enhancements, mapping, pagination)
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (run manual ingestion to seed jobs)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: Open /projects; verify < 3s load; test search/filter
5. Deploy/demo

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. US1 → Fast Projects page (MVP!)
3. US2 → Scheduled ingestion
4. US3 → Status tracking
5. US4 → Discover persists
6. Polish → Proposals linkage, tests

### Suggested MVP Scope

**Phases 1–3** (T001–T015): Setup + Foundational + US1. Delivers fast Projects page from persisted jobs. Requires one-time manual ingestion to seed data before US1 validation.

---

## Notes

- [P] tasks = different files or independent work
- [Story] label maps task to user story for traceability
- Each user story independently testable per spec.md
- Reference autobidder-etl-rag-schema-spec.md for domain filter keywords, ETL flow, schema details
- Commit after each task or logical group
