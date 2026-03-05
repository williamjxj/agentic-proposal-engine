# Quickstart: Improve the UI (002-improve-ui)

**Branch**: `002-improve-ui` | **Date**: 2025-03-05

## Prerequisites

- Docker + Docker Compose (PostgreSQL, ChromaDB)
- Node.js 20+
- Backend running on port 8000
- Frontend dependencies: `framer-motion`, shadcn components (magicui-style effects implemented via CSS)

## Setup

```bash
# 1. Start infrastructure
docker-compose up -d

# 2. Backend (terminal 1)
cd backend && source venv/bin/activate && uvicorn app.main:app --reload --port 8000

# 3. Frontend (terminal 2)
cd frontend && npm install && npm run dev
```

## Demo User Configuration

Add to `frontend/.env.local`:

```env
NEXT_PUBLIC_DEMO_EMAIL=jxjwilliam@2925.com
NEXT_PUBLIC_DEMO_PASSWORD=<your-demo-password>
```

Ensure the demo user exists in the backend (signup or seed script).

## Verification Checklist

### Auth & Demo User

- [x] Login page shows "Try as demo user" link
- [x] Signup page shows "Try as demo user" link
- [x] Clicking demo link signs in as `jxjwilliam@2925.com` and redirects to dashboard (requires NEXT_PUBLIC_DEMO_PASSWORD in .env.local)
- [x] If env vars missing, demo link is hidden or shows appropriate message

### Visual Consistency

- [x] Dashboard, Projects, Proposals, Knowledge Base, Strategies, Keywords, Analytics, Settings use consistent headings, buttons, cards
- [x] Form inputs use shadcn `Input`/`Label` patterns
- [x] Success/error feedback uses consistent toast/alert styling (ToastProvider, useToast)

### Navigation

- [x] Sidebar highlights current page (enhanced active state)
- [x] Proposal creation shows step indicators (Job Reference → Proposal Details → Submit)
- [x] Any page reachable in ≤2 clicks from sidebar

### Responsive

- [x] Desktop (1920px): Full layout
- [x] Tablet (768px): Content reflows, no horizontal scroll
- [x] Mobile (375px): Sidebar collapses to Sheet drawer; forms usable
- [x] Modals/dialogs visible and usable at all sizes (max-h-[90vh], overflow-y-auto)

### Loading & Feedback

- [x] Projects list: CardListSkeleton during load
- [x] Proposal generation: Loading indicator while AI generates ("⏳ Generating...")
- [x] Document upload: Spinner + "Uploading..." status feedback
- [x] Empty states show helpful guidance (EmptyState component, projects, proposals)

### Animations (Optional)

- [x] Page transitions (PageTransition wrapper on dashboard)
- [x] List stagger on load (projects)
- [x] Card hover states (ProjectCard, StatsCard)
- [x] `prefers-reduced-motion` respected (useReduceMotion, CSS media queries)

## Key Files

| Area | Path |
|------|------|
| Login | `frontend/src/app/(auth)/login/page.tsx` |
| Signup | `frontend/src/app/(auth)/signup/page.tsx` |
| Sidebar | `frontend/src/components/shared/app-sidebar.tsx` |
| Projects | `frontend/src/app/(dashboard)/projects/page.tsx` |
| Proposals | `frontend/src/app/(dashboard)/proposals/page.tsx`, `proposals/new/page.tsx` |
| Knowledge Base | `frontend/src/app/(dashboard)/knowledge-base/page.tsx` |
| Dashboard layout | `frontend/src/app/(dashboard)/layout.tsx` |

## Related Docs

- [plan.md](./plan.md)
- [research.md](./research.md)
- [data-model.md](./data-model.md)
- [../../docs/proposal-workflow-ui.md](../../docs/proposal-workflow-ui.md)
- [../../docs/user-guides.md](../../docs/user-guides.md)
