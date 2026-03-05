# Auto-Bidder Frontend

Next.js 15 frontend for the Auto-Bidder AI proposal platform.

---

## Stack

- **Framework:** Next.js 15.3.5 (App Router)
- **React:** 19
- **UI:** shadcn/ui, TailwindCSS 4
- **State:** TanStack Query 5
- **Auth:** Custom JWT (localStorage + cookie)

---

## Quick Start

```bash
npm install
cp .env.example .env.local
# Edit .env.local: NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
npm run dev
```

Runs on [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build |
| `npm run start` | Run production build |
| `npm run lint` | ESLint |
| `npm run type-check` | TypeScript check |

---

## Structure

```
src/
├── app/              # Next.js App Router (pages, layout)
├── components/       # Shared and workflow components
├── lib/              # API client, auth, utilities
└── hooks/            # Custom hooks (useAutoSave, useAuth, etc.)
```

---

## User Guides

See [docs/user-guides.md](../docs/user-guides.md) for how to start and use the app in the UI.
