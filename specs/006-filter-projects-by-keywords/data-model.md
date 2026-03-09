# Data Model: Filter Projects by Keywords

**Feature**: 006-filter-projects-by-keywords  
**Spec**: [spec.md](./spec.md)  
**Dependencies**: 003-projects-etl-persistence, 005-refactor-pg-database

## Overview

This feature does not introduce new tables. It extends the semantics of existing entities to support keyword-based filtering at list time. The `keywords` table is used as the source of filter keywords when the client does not provide an explicit `search` parameter.

## Entity Usage

### projects (existing)

Used as the target of keyword filtering. Matching fields:

| Field | Match behavior |
|-------|----------------|
| title | ILIKE `%keyword%` |
| description | ILIKE `%keyword%` |
| skills_required | Any element ILIKE `%keyword%` (via unnest or array_to_string) |

Filter logic: Project is included if it matches **at least one** keyword (OR).

---

### keywords (existing)

Repurposed for list filtering (in addition to existing discovery use).

| Field | Role in filtering |
|-------|-------------------|
| user_id | Filter keywords are per-user |
| keyword | Term used in OR matching |
| is_active | Only `is_active = true` keywords participate in filter |

When resolving default filter keywords: fetch user's active keywords; if none, use system fallback (`PROJECT_FILTER_KEYWORDS` env); if still none, no keyword filter applied (show all).

---

### Key entities (logical)

- **Filter Keywords**: Ordered set of terms. Source: (1) `search` query param, (2) user's active keywords, (3) system config. Applied with OR logic against projects.
- **Project Match**: A project matches if `(title ILIKE %kw1% OR description ILIKE %kw1% OR skill ILIKE %kw1%) OR ...` for any kw in the set.

## State Transitions

None. Filtering is stateless at the entity level.

## Validation Rules

- Empty or whitespace-only keywords are ignored.
- Keywords are trimmed and deduplicated before building the query.
- When no keywords: return all projects (no filter clause).
