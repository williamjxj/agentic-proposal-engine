# Feature Specification: Filter Projects by Keywords

**Feature Branch**: `006-filter-projects-by-keywords`  
**Created**: 2026-03-09  
**Status**: Draft  
**Input**: User description: "make keywords used in filter original ETL jobs/project/scraping data as well. Currently after loading projects (from hf etc), it list all projects without filtering. that's not what I want. I am expecting: 1. scraping as the same, scraping all datasets. 2. before display in projects page, the data should be filter by keywords (OR, e.g. 'python,ts,ai': if any word matches, then it is chosen and list) 3. the keywords are all used like OR to do the map-reduce. this way I will only focus on meaningful dataset/projects without waste my time."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Keyword-Filtered Project List (Priority: P1)

A freelancer opens the Projects page and sees only projects that match their configured keywords. Projects are filtered so that if a project's title, description, or skills contain any of the keywords, it is included. The user avoids scrolling through irrelevant projects and focuses on meaningful opportunities.

**Why this priority**: This is the core value—reducing noise so users see only relevant projects.

**Independent Test**: Can be fully tested by configuring keywords (e.g., "python,ts,ai"), loading the Projects page, and verifying that only projects matching at least one keyword are shown.

**Acceptance Scenarios**:

1. **Given** keywords are configured (e.g., "python,ts,ai"), **When** the user loads the Projects page, **Then** only projects matching at least one keyword (in title, description, or skills) are displayed.
2. **Given** a project has "Python" in its description, **When** "python" is in the keyword list, **Then** that project appears in the list.
3. **Given** a project has "TypeScript" in skills but neither "Python" nor "AI", **When** keywords include "python,ts,ai", **Then** the project appears because "ts" matches "TypeScript".
4. **Given** no keywords match a project, **When** the list is displayed, **Then** that project is excluded.

---

### User Story 2 - Unchanged Scraping and ETL (Priority: P2)

The system continues to scrape and ingest all datasets from sources (e.g., HuggingFace) without applying keyword filters during ingestion. The full dataset remains available; filtering happens only when preparing data for display on the Projects page.

**Why this priority**: Ensures data completeness for future filter changes; users can update keywords without re-scraping.

**Independent Test**: Can be fully tested by running ingestion and verifying that all projects from the source are stored, regardless of keyword configuration.

**Acceptance Scenarios**:

1. **Given** an ETL or scraping job runs, **When** it completes, **Then** all projects from the source are ingested and stored.
2. **Given** keyword filters are configured, **When** ingestion runs, **Then** the keyword filter does not affect what is scraped or stored.
3. **Given** a user changes their keywords, **When** they reload the Projects page, **Then** the new filter is applied to the same stored data without re-fetching.

---

### User Story 3 - Configurable Keywords (Priority: P3)

A user can define and update the list of keywords used for filtering. Keywords are treated as OR logic: a project matches if any keyword appears in the relevant fields. The user can add or remove keywords to narrow or broaden the displayed set.

**Why this priority**: Enables personalized filtering so users can tailor the view to their interests.

**Independent Test**: Can be fully tested by updating keywords and verifying the Projects page list updates accordingly.

**Acceptance Scenarios**:

1. **Given** the user adds a new keyword, **When** they save and reload the Projects page, **Then** additional projects matching the new keyword appear.
2. **Given** the user removes a keyword, **When** they save and reload, **Then** projects that matched only that keyword no longer appear.
3. **Given** the user clears all keywords, **When** no keywords are configured, **Then** either all projects are shown or a sensible default applies (e.g., show all, or prompt to add keywords).

---

### Edge Cases

- What happens when no keywords are configured? The system shows all projects (or a configurable default). No keyword filter means no filtering applied.
- What happens when keywords are configured but no projects match? The Projects page shows an empty list with a clear message that no matching projects were found.
- How does the system handle case sensitivity? Keyword matching is case-insensitive (e.g., "python" matches "Python").
- What happens when a keyword is a substring of a longer word? A project is included if the keyword appears as a substring (e.g., "ts" matches "TypeScript", "ai" matches "AI" or "maintenance"). Users can use more specific keywords to narrow results.
- How does the system handle special characters or empty keywords? Empty or whitespace-only keywords are ignored. Delimiter (e.g., comma) separates multiple keywords.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST apply a keyword filter before displaying projects on the Projects page. Only projects matching at least one configured keyword are shown.
- **FR-002**: Keyword matching MUST use OR logic: if any keyword matches a project’s relevant fields (title, description, skills), the project is included.
- **FR-003**: Keywords MUST be configurable by the user or at the system level so the filter can be updated without changing code.
- **FR-004**: Scraping and ETL MUST continue to ingest all projects from configured sources. Keyword filtering MUST NOT be applied during ingestion.
- **FR-005**: System MUST match keywords against project title, description, and skills (or equivalent fields from the data model).
- **FR-006**: Keyword matching MUST be case-insensitive.
- **FR-007**: Multiple keywords MUST be supported (e.g., comma-separated list). Each keyword is evaluated independently with OR logic.
- **FR-008**: When no keywords are configured, the system MUST show all projects (or a documented default behavior).

### Key Entities

- **Project/Job**: Represents a freelance opportunity. Relevant fields for keyword matching: title, description, skills. Relationships: same as existing jobs model (003-projects-etl-persistence).
- **Keyword Filter**: A set of terms used to filter projects. Each term is matched with OR logic against project fields. Source: user or system configuration.

## Assumptions

- Keywords are stored and retrieved from user preferences or a system configuration store. The exact storage mechanism is an implementation detail.
- The projects/jobs data model from 003-projects-etl-persistence is used. Keyword matching applies to title, description, and skills_required (or equivalent).
- Substring matching is acceptable (e.g., "ts" matches "TypeScript"). Users can choose more specific keywords to avoid false positives.
- HuggingFace and other data sources remain unchanged; no changes to scraping logic or ETL pipelines.

## Dependencies

- 003-projects-etl-persistence: Projects/jobs data and API. Filtering is applied when serving the list for the Projects page.
- Projects page UI: Must display the filtered list; no changes required if API contract remains compatible.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users see only projects matching at least one configured keyword when keywords are set.
- **SC-002**: Changing keywords updates the displayed list within the same page load cycle (or after a reload) without re-scraping or re-ingesting data.
- **SC-003**: ETL and scraping continue to ingest 100% of available projects from configured sources; keyword filter does not affect ingestion volume.
- **SC-004**: Users report spending less time browsing irrelevant projects when keyword filtering is enabled (qualitative feedback).
- **SC-005**: Projects page load time remains within acceptable limits (e.g., under 3 seconds) after filtering is applied.
