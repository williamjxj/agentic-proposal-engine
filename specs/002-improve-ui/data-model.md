# Data Model: Improve the UI (Frontend)

**Branch**: `002-improve-ui` | **Date**: 2025-03-05

**Scope**: Frontend only. No backend schema changes. This document describes UI state and configuration used by the improved UI.

---

## UI Configuration

### Demo User Config

Used for the "Try as demo user" feature on login/signup pages.

| Field | Type | Source | Purpose |
|-------|------|--------|---------|
| `demoEmail` | string | `NEXT_PUBLIC_DEMO_EMAIL` or constant | Pre-filled or used for one-click sign-in |
| `demoPassword` | string | `NEXT_PUBLIC_DEMO_PASSWORD` or constant | Used for one-click sign-in (non-sensitive for demo) |

**Validation**: If env vars are missing, hide the demo link or show a fallback message.

---

## UI State (No Schema Change)

All existing state remains. New UI may introduce:

- **Animation state**: `reduceMotion` from `prefers-reduced-motion` media query
- **Step indicator**: Current step index in multi-step flows (e.g., proposal creation) — derived from URL or local state
- **Toast/notification queue**: Handled by existing Radix Toast or similar

---

## Existing API Usage (Unchanged)

The frontend continues to use:

- `POST /api/auth/login` — login (including demo user)
- `POST /api/auth/signup` — signup
- `GET /api/projects/...` — job discovery
- `GET/POST /api/proposals/...` — proposals, drafts, generate-from-job
- `GET/POST /api/knowledge-base/...` — documents
- `GET/POST /api/strategies/...` — strategies
- `GET /api/keywords/...` — keywords
- `GET /api/analytics/...` — stats

No new endpoints. No request/response shape changes.

---

## Component Hierarchy (Reference)

```
App
├── (auth)/layout
│   ├── login/page   — + Demo user link
│   └── signup/page  — + Demo user link
└── (dashboard)/layout
    ├── AppSidebar   — Consistent active state, responsive
    ├── TopHeader
    └── main
        ├── dashboard/page
        ├── projects/page   — Job cards, Discover dialog
        ├── proposals/page + proposals/new/page
        ├── knowledge-base/page
        ├── strategies/page
        ├── keywords/page
        ├── analytics/page
        └── settings/page
```

All pages receive consistent wrappers (Card, Skeleton, etc.) and animation wrappers (BlurFade, AnimatePresence) where appropriate.
