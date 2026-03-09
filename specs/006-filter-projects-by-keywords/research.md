# Research: Filter Projects by Keywords

**Feature**: 006-filter-projects-by-keywords  
**Spec**: [spec.md](./spec.md)  
**Plan**: [plan.md](./plan.md)

## Research Tasks Resolved

### R1: Where do filter keywords come from?

**Decision**: Reuse the existing `keywords` table (user_id, keyword, is_active). User's active keywords serve as the default filter when listing projects. If the user has no keywords, fall back to a system-level config (env var `PROJECT_FILTER_KEYWORDS`). If neither exists, show all projects (FR-008).

**Rationale**: The spec requires "keywords configurable by user or system level." The `keywords` table already stores per-user keywords for discovery; using them for list filtering avoids duplication and keeps configuration in one place.

**Alternatives considered**:
- New `user_filter_keywords` table: Rejected—adds schema complexity; existing keywords suffice.
- Frontend-only filter: Rejected—spec requires filtering before display; server must apply it for consistency.

---

### R2: Keyword matching semantics (OR, case, fields)

**Decision**: OR logic, case-insensitive (ILIKE), match against `title`, `description`, and `skills_required`. Substring matching (e.g., "ts" matches "TypeScript") as specified.

**Rationale**: Spec FR-002, FR-005, FR-006. PostgreSQL `ILIKE '%kw%'` provides case-insensitive substring match. For `skills_required` (TEXT[]), use `EXISTS (SELECT 1 FROM unnest(skills_required) s WHERE s ILIKE '%kw%')` or equivalent.

**Alternatives considered**:
- Full-text search (tsvector): More precise but requires different UX (phrase vs term); spec explicitly asks for simple OR substring.
- Exact match: Rejected—spec says substring (e.g., "ts" → "TypeScript").

---

### R3: Interaction with existing `search` parameter

**Decision**: `search` query param takes precedence. If the client sends `search`, use it. If not, resolve filter keywords from user keywords (or system fallback) and apply them. This satisfies "before display" filtering while allowing user override.

**Rationale**: Keeps backward compatibility; projects page can still pass `search` from the input. When the input is empty, the backend applies the default keyword filter.

---

### R4: ETL / scraping unchanged

**Decision**: No changes to `hf_loader`, `freelancer_etl`, or any scraping pipeline. Filtering is applied only in `project_service.list_projects` and the projects router when serving the list endpoint.

**Rationale**: Spec FR-004 explicitly requires ETL to ingest all projects.

---

### R5: PostgreSQL array matching for skills

**Decision**: For each keyword, add `OR EXISTS (SELECT 1 FROM unnest(p.skills_required) AS s WHERE s ILIKE $1)` (or `p.skills_required::text ILIKE` if skills_required is sparse). Use parameterized `%kw%` for ILIKE.

**Rationale**: `skills_required` is `TEXT[]`. `unnest` + ILIKE ensures we match within each skill. Alternative: `array_to_string(p.skills_required, ' ') ILIKE '%kw%'`—simpler but may false-match across skill boundaries; acceptable for OR filter.

**Alternatives considered**:
- GIN index on skills: Existing `idx_projects_skills` may help; ILIKE on arrays doesn't use it directly. For typical list sizes, sequential scan on filtered set is acceptable.
