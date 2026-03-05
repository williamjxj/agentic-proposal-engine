# Tasks: Improve the UI

**Input**: Design documents from `/specs/002-improve-ui/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, quickstart.md

**Tests**: Not explicitly requested in spec; omitted. Add manually if desired.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions

- **Frontend**: `frontend/src/` at repository root
- **Components**: `frontend/src/components/`
- **Pages**: `frontend/src/app/(auth)/`, `frontend/src/app/(dashboard)/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Install dependencies and add UI component primitives

- [x] T001 Install framer-motion and magicui in frontend/package.json
- [x] T002 Add shadcn Button, Input, Label, Card components to frontend/src/components/ui/
- [x] T003 Add shadcn Skeleton component to frontend/src/components/ui/ for loading states
- [x] T004 Add shadcn Badge component to frontend/src/components/ui/ for skills and platform tags
- [x] T005 Create demo user config in frontend/src/lib/config/demo-user.ts reading NEXT_PUBLIC_DEMO_EMAIL and NEXT_PUBLIC_DEMO_PASSWORD

---

## Phase 2: Foundational (Demo User & Auth Pages)

**Purpose**: Demo user access and auth page polish — blocks first-time visitor flow

**⚠️ CRITICAL**: Demo user enables visitors to try the app without registration

- [x] T006 Add "Try as demo user" link/button to frontend/src/app/(auth)/login/page.tsx
- [x] T007 Add "Try as demo user" link/button to frontend/src/app/(auth)/signup/page.tsx
- [x] T008 Refactor login page to use shadcn Button and Input in frontend/src/app/(auth)/login/page.tsx
- [x] T009 Refactor signup page to use shadcn Button and Input in frontend/src/app/(auth)/signup/page.tsx

**Checkpoint**: First-time visitors can click "Try as demo user" and explore the app

---

## Phase 3: User Story 1 - Consistent Visual Experience (Priority: P1) 🎯 MVP

**Goal**: Unified typography, spacing, colors, and component styles across all main pages (projects, proposals, knowledge base, keywords, strategies, analytics, settings).

**Independent Test**: Visit each main area and verify headings, buttons, cards, and forms use the same design language.

- [x] T010 [P] [US1] Create shared PageHeader component in frontend/src/components/shared/page-header.tsx
- [x] T011 [P] [US1] Create shared PageContainer component in frontend/src/components/shared/page-container.tsx
- [x] T012 [US1] Apply PageHeader and PageContainer to dashboard page in frontend/src/app/(dashboard)/dashboard/page.tsx
- [x] T013 [US1] Apply PageHeader and PageContainer to projects page in frontend/src/app/(dashboard)/projects/page.tsx
- [x] T014 [US1] Apply PageHeader and PageContainer to proposals page in frontend/src/app/(dashboard)/proposals/page.tsx
- [x] T015 [US1] Apply PageHeader and PageContainer to proposals/new page in frontend/src/app/(dashboard)/proposals/new/page.tsx
- [x] T016 [US1] Apply PageHeader and PageContainer to knowledge-base page in frontend/src/app/(dashboard)/knowledge-base/page.tsx
- [x] T017 [US1] Apply PageHeader and PageContainer to strategies page in frontend/src/app/(dashboard)/strategies/page.tsx
- [x] T018 [US1] Apply PageHeader and PageContainer to keywords page in frontend/src/app/(dashboard)/keywords/page.tsx
- [x] T019 [US1] Apply PageHeader and PageContainer to analytics page in frontend/src/app/(dashboard)/analytics/page.tsx
- [x] T020 [US1] Apply PageHeader and PageContainer to settings page in frontend/src/app/(dashboard)/settings/page.tsx
- [x] T021 [US1] Standardize project cards with shadcn Card and Badge in frontend/src/app/(dashboard)/projects/page.tsx
- [x] T022 [US1] Standardize form inputs to shadcn Input/Label across proposal form in frontend/src/app/(dashboard)/proposals/new/page.tsx
- [x] T023 [US1] Standardize success/error feedback styling (toast or alert) across all pages that perform actions

**Checkpoint**: All dashboard pages share consistent headings, cards, and form controls

---

## Phase 4: User Story 2 - Clear Navigation and Wayfinding (Priority: P2)

**Goal**: User always knows current page; multi-step flows show progress; any section reachable in ≤2 clicks.

**Independent Test**: Verify active section is highlighted, step indicators appear in proposal flow, and navigation is ≤2 clicks.

- [x] T024 [US2] Enhance sidebar active state styling in frontend/src/components/shared/app-sidebar.tsx
- [x] T025 [US2] Add step indicators to proposal creation flow in frontend/src/app/(dashboard)/proposals/new/page.tsx
- [x] T026 [US2] Add breadcrumb or context indicator for multi-step flows if needed in frontend/src/components/shared/
- [x] T027 [US2] Verify all main sections reachable in ≤2 clicks from any page (audit and fix if needed)

**Checkpoint**: Navigation is clear; proposal creation shows step progress

---

## Phase 5: User Story 3 - Responsive Layout (Priority: P3)

**Goal**: Layout adapts from 320px to desktop; no horizontal scroll; modals usable on all sizes.

**Independent Test**: Resize browser to tablet and phone; verify content reflows and modals are visible.

- [x] T028 [US3] Add mobile sidebar (Sheet/drawer) for small screens in frontend/src/components/shared/app-sidebar.tsx
- [x] T029 [US3] Ensure dashboard layout is responsive (flex/grid breakpoints) in frontend/src/app/(dashboard)/layout.tsx
- [x] T030 [US3] Ensure Discover Jobs dialog is responsive in frontend/src/app/(dashboard)/projects/page.tsx
- [x] T031 [US3] Ensure proposal form and modals are usable on mobile in frontend/src/app/(dashboard)/proposals/new/page.tsx
- [x] T032 [US3] Audit and fix modal/dialog max-height and overflow on small viewports across frontend/src/

**Checkpoint**: App works on phone, tablet, and desktop without horizontal scroll

---

## Phase 6: User Story 4 - Clear Feedback for Loading and Errors (Priority: P4)

**Goal**: Loading indicators for async actions; success confirmation; user-friendly error messages; empty states with guidance.

**Independent Test**: Trigger loading actions, succeed, fail, and view empty lists; verify appropriate feedback.

- [x] T033 [US4] Add Skeleton loading for projects list in frontend/src/app/(dashboard)/projects/page.tsx
- [x] T034 [US4] Add Skeleton loading for proposals list in frontend/src/app/(dashboard)/proposals/page.tsx
- [x] T035 [US4] Add loading indicator for AI Generate in frontend/src/app/(dashboard)/proposals/new/page.tsx
- [x] T036 [US4] Add loading/status feedback for document upload in frontend/src/components/knowledge-base/document-upload.tsx
- [x] T037 [US4] Add or improve empty states with actionable guidance in frontend/src/components/shared/empty-state.tsx and apply to projects, proposals, knowledge-base, strategies, keywords
- [x] T038 [US4] Standardize error message display (plain-language + suggested next steps) across forms and actions
- [x] T039 [US4] Ensure success confirmation (toast or inline) for save, submit, and upload actions

**Checkpoint**: Users see loading, success, and error feedback; empty lists show helpful guidance

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Animations, magicui polish, accessibility, validation

- [x] T040 [P] Add framer-motion page transition wrapper for auth and dashboard in frontend/src/app/
- [x] T041 [P] Add staggered list animation (framer-motion) for project cards in frontend/src/app/(dashboard)/projects/page.tsx
- [x] T042 Add useReduceMotion hook or media query and respect prefers-reduced-motion in framer-motion usage
- [x] T043 [P] Add magicui Blur Fade or Shimmer Button for primary CTAs (e.g., Generate Proposal, AI Generate) in key pages
- [x] T044 [P] Add Shine Border or Border Beam to job reference card in frontend/src/app/(dashboard)/proposals/new/page.tsx
- [x] T045 Run quickstart.md verification checklist and fix any gaps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on T001–T005 (demo config)
- **Phase 3 (US1)**: Depends on Phase 1 and Phase 2
- **Phase 4 (US2)**: Depends on Phase 3 (needs consistent layout)
- **Phase 5 (US3)**: Depends on Phase 3
- **Phase 6 (US4)**: Depends on Phase 3 (needs Skeleton, empty-state components)
- **Phase 7 (Polish)**: Depends on Phases 3–6

### User Story Dependencies

- **US1 (P1)**: Can start after Setup + Foundational — MVP
- **US2 (P2)**: Builds on US1 layout
- **US3 (P3)**: Builds on US1; can parallel with US2
- **US4 (P4)**: Builds on US1; can parallel with US2, US3

### Parallel Opportunities

- T010 and T011: PageHeader and PageContainer can be built in parallel
- T012–T020: Applying layout to each page can be parallelized (different files)
- T040, T041, T043, T044: Animation and magicui polish can run in parallel

---

## Parallel Example: User Story 1

```bash
# Create shared components together:
Task T010: "Create PageHeader in frontend/src/components/shared/page-header.tsx"
Task T011: "Create PageContainer in frontend/src/components/shared/page-container.tsx"

# Apply to multiple pages in parallel:
Task T012–T020: Apply PageHeader/PageContainer to each dashboard page
```

---

## Implementation Strategy

### MVP First (Phases 1–3)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (demo user)
3. Complete Phase 3: US1 Consistent Visual Experience
4. **STOP and VALIDATE**: Visit all pages and verify design consistency
5. Deploy/demo if ready

### Incremental Delivery

1. Setup + Foundational → Demo user works
2. US1 → Visual consistency across pages (MVP)
3. US2 → Navigation clarity
4. US3 → Responsive layout
5. US4 → Loading and error feedback
6. Polish → Animations and magicui

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps to spec.md user stories for traceability
- Each user story phase is independently testable
- No backend changes; all work in frontend/
- Demo user `jxjwilliam@2925.com` must exist in backend auth; configure via .env.local
