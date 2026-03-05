# Implementation Plan: Improve the UI

**Branch**: `002-improve-ui` | **Date**: 2025-03-05 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `/specs/002-improve-ui/spec.md`

**User Constraints**:
- Frontend only — no business logic changes, no backend changes
- Make the UI better represent the underlying app logic
- Add demo user link (`jxjwilliam@2925.com`) on login/signup for first-time visitors
- Use shadcn/ui, framer-motion, and magicui for a more engaging, dynamic UX

## Summary

Improve the Auto-Bidder frontend UI to better communicate the existing logic and workflows. The core app (job discovery, proposal generation, knowledge base, RAG-powered AI) is functional; the interface needs significant improvement to be more intuitive, visually coherent, and interactive. Changes are confined to the frontend: components, layouts, animations, and UX patterns. No API changes or backend modifications.

**Key deliverables**:
1. **Visual consistency** — Unified typography, spacing, and component styles across dashboard pages
2. **Navigation & wayfinding** — Clear active states, step indicators for multi-step flows (proposal creation)
3. **Responsive layout** — Mobile-first, works from 320px to desktop without horizontal scroll
4. **Feedback & polish** — Loading states (skeletons, spinners), success/error toasts, empty states
5. **Demo user access** — One-click “Try as demo user” on login/signup for `jxjwilliam@2925.com`
6. **Enhancements** — shadcn/ui components, framer-motion for transitions, magicui for engaging elements

## Technical Context

**Language/Version**: TypeScript 5.3, Node 20  
**Primary Dependencies**: Next.js 15, React 19, Tailwind CSS 4, shadcn/ui (Radix), framer-motion, magicui  
**Storage**: N/A (frontend only; uses existing API client)  
**Testing**: Vitest/Playwright for frontend  
**Target Platform**: Vercel (frontend), browser  
**Project Type**: Web application (frontend-only changes in monorepo)  
**Performance Goals**: LCP < 2.5s, CLS < 0.1, animations respect prefers-reduced-motion  
**Constraints**: No backend changes; no new API endpoints; demo user must already exist in auth system  
**Scale/Scope**: MVP for funding; single-tenant; 10–100 concurrent users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|-----------|--------|
| Test-first | E2E tests for critical UI flows (login, demo user, proposal creation steps) |
| Integration testing | Existing API usage unchanged; frontend-only changes |
| Observability | N/A (no backend changes) |
| Simplicity | Incremental UI improvements; no new architecture |
| Security | Demo user credentials via env or config; no secrets in client bundle |

**No violations** requiring justification. Follows existing .cursor rules (nextjs, python-llm).

## Project Structure

### Documentation (this feature)

```text
specs/002-improve-ui/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output (UI state / config)
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (optional - existing API usage)
└── tasks.md             # Phase 2 output (/speckit.tasks)
```

### Source Code (repository root)

```text
frontend/
├── src/
│   ├── app/
│   │   ├── (auth)/            # login, signup (demo user link)
│   │   └── (dashboard)/       # projects, proposals, knowledge-base, etc.
│   ├── components/           # shared, workflow, page-specific
│   │   ├── ui/                # shadcn components + magicui
│   │   └── ...
│   └── lib/
└── __tests__/
```

**Structure Decision**: Existing monorepo. Changes confined to `frontend/src/`. Backend untouched.

## Complexity Tracking

*No violations requiring justification.*
