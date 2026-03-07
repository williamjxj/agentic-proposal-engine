# Feature Specification: Projects ETL Persistence

**Feature Branch**: `003-projects-etl-persistence`  
**Created**: 2026-03-06  
**Status**: Draft  
**Input**: User description: "improve based on the above and autobidder-etl-rag-schema-spec"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Fast Projects Page Load (Priority: P1)

A freelancer opens the Projects page to browse job opportunities. The page displays a list of relevant jobs within a few seconds, without noticeable delay. They can search, filter, and paginate without waiting for external data fetches on each interaction.

**Why this priority**: Slow page loads frustrate users and block the core workflow. Fast retrieval from persisted data is the primary user-facing improvement.

**Independent Test**: Can be fully tested by opening the Projects page and verifying that job listings appear within an acceptable time, with search and filter responding quickly.

**Acceptance Scenarios**:

1. **Given** job data has been ingested into the system, **When** a user opens the Projects page, **Then** job listings appear within 3 seconds.
2. **Given** a user applies search or filter criteria, **When** they submit the search, **Then** results update within 2 seconds.
3. **Given** a user navigates to a different page and returns, **When** they load the Projects page again, **Then** data loads from the local store without re-fetching from external sources.

---

### User Story 2 - Scheduled Job Ingestion (Priority: P2)

The system automatically ingests job postings from configured data sources (e.g., HuggingFace datasets, future live platforms) on a defined schedule. Only job postings that match the allowed domain categories (AI/ML, web development, full-stack, DevOps, cloud, software outsourcing, UI design) are stored. Duplicate jobs from the same source are not stored twice.

**Why this priority**: Persistence requires data to exist. Scheduled ingestion ensures the job store stays populated and current without manual intervention.

**Independent Test**: Can be fully tested by triggering an ingestion run and verifying that new jobs appear in the Projects list, domain-irrelevant jobs are excluded, and duplicates are not created.

**Acceptance Scenarios**:

1. **Given** an ingestion run executes, **When** jobs are extracted from the data source, **Then** only jobs matching at least one allowed domain category are stored.
2. **Given** a job with the same source identifier already exists, **When** ingestion processes that job again, **Then** the system updates the existing record rather than creating a duplicate.
3. **Given** ingestion runs on its scheduled interval, **When** the run completes, **Then** the Projects page reflects the newly ingested jobs on the next load.

---

### User Story 3 - Job Status Tracking (Priority: P3)

A freelancer reviews a job, marks it as "reviewed" or "applied," and later records the outcome (won, lost). The system persists these status changes so the user can filter by status and track their bidding pipeline over time.

**Why this priority**: Status tracking enables pipeline management and reduces duplicate effort on jobs already reviewed or applied.

**Independent Test**: Can be fully tested by changing a job's status and verifying it persists across sessions and appears correctly in filtered views.

**Acceptance Scenarios**:

1. **Given** a user views a job listing, **When** they mark it as "reviewed" or "applied," **Then** the status is saved and reflected when they return.
2. **Given** a user has applied filters (e.g., "only applied"), **When** they view the list, **Then** only jobs matching the selected status are shown.
3. **Given** a user records an outcome (won/lost) for a job, **When** they view their history, **Then** the outcome is preserved for reporting and learning.

---

### User Story 4 - Discover and Persist New Jobs (Priority: P4)

A freelancer uses the "Discover Jobs" flow with custom keywords. The system fetches matching jobs from the configured data source, stores them for future fast retrieval, and displays them immediately. Subsequent visits to the Projects page show these jobs without re-fetching.

**Why this priority**: Complements scheduled ingestion by allowing users to pull in additional opportunities on demand while still benefiting from persistence.

**Independent Test**: Can be fully tested by running Discover with keywords, verifying jobs appear, and confirming they persist for future page loads.

**Acceptance Scenarios**:

1. **Given** a user enters keywords and triggers Discover, **When** matching jobs are found, **Then** they are stored and displayed.
2. **Given** jobs were discovered in a previous session, **When** the user opens the Projects page, **Then** those jobs appear without a new external fetch.
3. **Given** a discovered job already exists (same source and identifier), **When** Discover runs again, **Then** the system does not create a duplicate record.

---

### Edge Cases

- What happens when ingestion fails (e.g., external source unavailable)? The system should log the failure, retain previously ingested data, and retry on the next scheduled run. Users continue to see existing jobs.
- How does the system handle jobs that no longer exist at the source? Jobs can be marked as expired or archived after a configurable age (e.g., 30 days) to keep the list relevant.
- What happens when a user discovers jobs while ingestion is running? Both flows should safely handle concurrent writes; duplicates are prevented by source identifier.
- How does the system handle very large result sets? Pagination and filtering must work correctly so users can navigate without performance degradation.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST persist job postings to a local store so the Projects page can retrieve them without fetching from external sources on each request.
- **FR-002**: System MUST run scheduled ingestion from configured data sources (e.g., HuggingFace datasets) at defined intervals to keep job data current.
- **FR-003**: System MUST apply a domain filter so only job postings matching allowed categories (AI/ML, web development, full-stack, DevOps, cloud, software outsourcing, UI design) are stored.
- **FR-004**: System MUST deduplicate jobs by source platform and external identifier; re-ingestion of the same job MUST update the existing record.
- **FR-005**: System MUST support job status workflow: new, reviewed, applied, won, lost, archived.
- **FR-006**: Users MUST be able to search and filter jobs by keywords, skills, platform, status, budget, and date range.
- **FR-007**: System MUST support the "Discover Jobs" flow: user-provided keywords trigger a fetch, and results are stored for future retrieval.
- **FR-008**: System MUST support full-text search over job title and description for keyword-based discovery.
- **FR-009**: System MUST record ingestion run metadata (source, start/end time, counts of extracted, filtered, inserted, updated) for audit and debugging.
- **FR-010**: Proposals and bids MUST be linkable to specific persisted jobs so users can trace which proposal was sent for which opportunity.

### Key Entities

- **Job**: A freelance opportunity from an external source. Key attributes: title, description, skills, budget, platform, source identifier, status, posted date. Relationships: linked to proposals/bids.
- **Ingestion Run**: A single execution of the ingestion pipeline. Key attributes: source, start/end time, status, counts (extracted, filtered, inserted, updated), error details if failed.
- **Domain Category**: A predefined set of allowed categories (e.g., AI/ML, web development) used to filter which jobs are stored.

## Assumptions

- HuggingFace datasets are the initial data source; live platform scrapers (Upwork, Freelancer, etc.) may be added later.
- Job data is shared across users (global job pool); user-specific views (e.g., "my applied jobs") are achieved via status and filters rather than per-user job copies.
- Domain filter categories align with the software outsourcing and tech freelancing domain; expansion to other domains would require category updates.
- Ingestion schedule is configurable (e.g., weekly for static datasets, more frequent for live sources when available).
- Stale jobs (e.g., older than 30 days) can be archived or hidden by default; exact retention is configurable.

## Dependencies

- Existing Projects page UI and API contracts; changes must remain compatible with current frontend expectations.
- Existing proposals and bids flows; job persistence enables linking proposals to jobs.
- Reference specification: `docs/todos/autobidder-etl-rag-schema-spec.md` for domain filter categories, ETL flow, and schema alignment.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see the Projects page load with job listings in under 3 seconds on typical connections.
- **SC-002**: Search and filter operations return results in under 2 seconds.
- **SC-003**: Scheduled ingestion completes successfully at least 95% of the time under normal conditions.
- **SC-004**: No duplicate jobs (same source and identifier) appear in the Projects list.
- **SC-005**: At least 80% of ingested jobs pass the domain filter when sourcing from mixed-content datasets.
- **SC-006**: Users can track job status (reviewed, applied, won, lost) and filter by status with correct results.
