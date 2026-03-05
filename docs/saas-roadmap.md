# Auto-Bidder: Production SaaS Outline and What You Need to Start

## 1. App Summary (from docs and codebase)

Auto-Bidder is an **AI-powered proposal platform** for freelancers: RAG (ChromaDB + OpenAI embeddings) + LLM (GPT-4-turbo) to generate personalized proposals from job descriptions and a user knowledge base (PDF/DOCX). Frontend is Next.js 15 + custom JWT auth; backend is Python FastAPI; data in PostgreSQL (docker-compose) and ChromaDB.

**Current state:** UI for keywords, strategies, knowledge base, settings, and drafts is in place. Backend has **JWT authentication** with bcrypt password hashing, **no real AI proposal generation** (strategy "test" is a stub), **no job discovery** (Crawlee removed from requirements), and **platform credentials stored in plaintext**.

---

## 2. Outsource Resources Used or Planned for Bidding


| Resource       | Purpose                                                              | Status                                                                                                        | What you need                                                                                                               |
| -------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **OpenAI**     | Proposal text (GPT-4-turbo), RAG embeddings (text-embedding-3-small) | In use (embeddings in [vector_store.py](backend/app/services/vector_store.py), LLM only in docs/placeholders) | `OPENAI_API_KEY` (required)                                                                                                 |
| **PostgreSQL** | Database (users, sessions, metadata)                                 | In use (docker-compose)                                                                                       | `DATABASE_URL` (PostgreSQL connection string)                                                                               |
| **ChromaDB**   | Vector store for RAG (embeddings)                                    | In use (self-hosted in docker-compose)                                                                        | `CHROMA_HOST`, `CHROMA_PORT` (e.g. http://localhost:8001)                                                                  |
| **Upwork**     | Job discovery (scrape or API), optional bid submit                   | Planned; not implemented                                                                                      | User OAuth tokens or API keys stored per user in `platform_credentials`; Upwork OAuth app (client id/secret) if using OAuth |
| **Freelancer** | Job discovery (RSS/API), optional bid submit                         | Planned; not implemented                                                                                      | User API key in `platform_credentials`; Freelancer API app credentials if required                                          |


**Bidding flow (from [architecture-diagram.md](diagrams/architecture-diagram.md)):** Job Discovery (Upwork/Freelancer) → Store projects in PostgreSQL → RAG context from ChromaDB → LLM proposal generation → Human review → Submit via platform API or copy-paste.

---

## 3. What You Need to Start (Checklist)

### 3.1 Required from day one

- **OpenAI API key** – [platform.openai.com](https://platform.openai.com/api-keys). Used for embeddings and proposal generation. Set as `OPENAI_API_KEY` in backend `.env`.
- **PostgreSQL database** – Running via docker-compose or hosted service (Neon, AWS RDS, Railway). Get:
  - **Connection string** → `DATABASE_URL` (backend)
  - Example: `postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/auto_bidder_dev`
- **JWT Secret** – Generate a secure random string for JWT token signing. Set as `JWT_SECRET` in backend `.env`.
  - Example: `openssl rand -hex 32`
- **Login / JWT:** Backend issues JWTs on sign-in via `/api/auth/login`. Frontend stores token in localStorage and sends `Authorization: Bearer <token>` ([client.ts](frontend/src/lib/api/client.ts)). Backend validates JWT and extracts `user_id` from token claims.
- **File Storage:** For document uploads, configure local storage or use cloud storage (S3, Cloudflare R2). No built-in storage bucket needed.

### 3.2 Optional / later (for real job discovery and submit)

- **Upwork:** For job listing (and optionally submitting bids):
  - **Option A (OAuth):** Create app in Upwork Developer Portal; users connect accounts; you store `access_token` / `refresh_token` in `platform_credentials`. Backend needs Upwork client id/secret only for the OAuth flow (not per-user).
  - **Option B (scraping):** No Upwork keys; Crawlee/scraper only. Higher risk of breakage and ToS issues.
- **Freelancer:** Same idea: user API key or OAuth in `platform_credentials`; app credentials only if you use OAuth.
- **Permission model:** Today the app only needs **your app's** JWT secret and OpenAI keys. Platform-specific API keys / OAuth tokens are **per-user** and stored in `platform_credentials` (must be encrypted at rest for production).

### 3.3 Environment summary

**Backend `.env` (required to run):**

- `OPENAI_API_KEY` – required for RAG + proposals  
- `DATABASE_URL` – PostgreSQL connection string
- `JWT_SECRET` – for signing/verifying JWT tokens
- `CHROMA_HOST`, `CHROMA_PORT` – ChromaDB connection (default `http://localhost:8001`)

**Frontend `.env.local`:**

- `NEXT_PUBLIC_BACKEND_API_URL` or `PYTHON_AI_SERVICE_URL` – backend base URL (e.g. `http://localhost:8000`)

**No separate "app-level" tokens** – only custom JWTs issued by backend at `/api/auth/login`.

---

## 4. Outline Todolist: Rest to Make It a Real Production SaaS

High-level order of work (details in implementation phase).

### 4.1 Auth and security (must-have for production)

1. **Backend JWT validation** – JWT validation is already implemented in backend routers. Tokens are verified and `user_id` extracted from claims. Files: [keywords.py](backend/app/routers/keywords.py), [strategies.py](backend/app/routers/strategies.py), [knowledge_base.py](backend/app/routers/knowledge_base.py), [settings.py](backend/app/routers/settings.py), [session.py](backend/app/routers/session.py), [draft.py](backend/app/routers/draft.py), [analytics.py](backend/app/routers/analytics.py).
2. **Encrypt platform credentials** – Encrypt `api_key`, `access_token`, `refresh_token` (and any secrets) in `platform_credentials` at rest (e.g. PostgreSQL pgcrypto or app-level encryption with a key from env). See [settings_service.py](backend/app/services/settings_service.py) and [003_biddinghub_merge.sql](database/migrations/003_biddinghub_merge.sql).
3. **File Storage Security** – Configure appropriate file upload validation and access controls. Document storage location in README and setup-and-run.md.

### 4.2 Core product: AI proposals

1. **Proposal generation endpoint** – Add e.g. `POST /api/proposals/generate` (or under `/api/drafts` with type proposal). Input: job title, description, skills, budget, strategy_id, user_id (from JWT). Orchestrate: fetch strategy, RAG query ChromaDB by user_id, call OpenAI to generate proposal; return structured draft. Replace placeholder in [strategy_service.test_strategy](backend/app/services/strategy_service.py) with this real pipeline.
2. **Wire frontend to proposal API** – Proposal studio (or existing draft UI) calls the new backend endpoint and saves result to draft_work / bids.
3. **Background document processing** – Move heavy doc processing (parse → chunk → embed → ChromaDB) to background (e.g. Celery/Redis or async task queue) so uploads don’t time out; optional progress via polling or webhooks.

### 4.3 Job discovery (bidding data source)

1. **Crawlee or API-based job discovery** – Re-add Crawlee (or use official APIs) for Upwork/Freelancer; normalize to internal "project" schema and store in PostgreSQL. Run as scheduled or on-demand; respect rate limits.
2. **Platform credential verification** – When user adds Upwork/Freelancer credentials, call platform validation endpoint (e.g. Upwork `/api/profiles/v1/me`, Freelancer as per their docs) and set `last_verified_at` / `verification_error` in `platform_credentials`. See [specs/002-ui-routers-improvement/research.md](specs/002-ui-routers-improvement/research.md).
3. **Projects UI and filters** – List discovered projects; filter by keywords, platform, date; “Generate proposal” from project.

### 4.4 Production hardening

1. **Rate limiting** – Per-user or per-IP limits on proposal generation, uploads, and auth-sensitive endpoints.
2. **File upload safety** – Validate file type (and optionally content); size limits; optional virus scan for production.
3. **Draft cleanup** – Scheduled job (e.g. cron or Vercel cron) to delete or archive old draft_work (see [production-deployment.md](production-deployment.md)).
4. **Monitoring** – Sentry (or similar) for backend and frontend; optional APM for latency and errors.
5. **Env and secrets** – No secrets in repo; production envs in Vercel/Railway; document required vars in README.

### 4.5 SaaS and scale

1. **Subscription and usage** – Use `user_profiles` / settings (e.g. `proposals_generated`, `proposals_limit`) to enforce tiers; integrate Stripe (or similar) for billing.
2. **E2E and regression** – E2E tests for: signup → upload doc → create strategy → generate proposal → save draft. Backend tests for JWT validation and proposal endpoint.
3. **Docs and runbooks** – Update README, QUICKSTART, and RESTART_GUIDE with production env checklist and “what you need to start” (this section). Add deployment and rollback steps (see [production-deployment.md](production-deployment.md)).

---

## 5. How to Start (Concrete)

1. **Get keys:** Create PostgreSQL database + OpenAI API key. Add them to backend `.env` and frontend `.env.local` as above. Generate `JWT_SECRET` with: `openssl rand -hex 32`
2. **Run locally:** `docker compose up -d` to start PostgreSQL and ChromaDB, then apply migrations with provided SQL files. Start backend (uvicorn) and frontend (npm run dev). Confirm health and signup/login.
3. **First production feature:** Implement real RAG + LLM proposal generation behind one endpoint and wire one UI path (e.g. "Generate" from a job) so a user can get a real proposal.
4. **Then:** File storage setup + credential encryption + job discovery (with what you need from Upwork/Freelancer as above).

---

## 6. Diagram: Bidding Data and Auth Flow

```mermaid
flowchart LR
  subgraph external [External Resources]
    OpenAI[OpenAI API]
    Upwork[Upwork API or Scraper]
    Freelancer[Freelancer API]
  end

  subgraph app [Auto-Bidder]
    FE[Next.js Frontend]
    BE[FastAPI Backend]
    Auth[JWT Auth Service]
    PostgresDB[(PostgreSQL)]
    ChromaDB[(ChromaDB)]
  end

  User -->|Login| Auth
  Auth -->|JWT Token| FE
  FE -->|Bearer JWT| BE
  BE -->|Verify JWT, user_id| PostgresDB
  BE -->|Embeddings + LLM| OpenAI
  BE -->|RAG query| ChromaDB
  BE -->|Optional job fetch| Upwork
  BE -->|Optional job fetch| Freelancer
  User -->|Store credentials| platform_credentials
```



---

## 7. References

- [README.md](README.md) – Stack, quick start, env vars  
- [NEXT_STEPS.md](NEXT_STEPS.md) – Auth, storage, credentials, testing  
- [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md) – Job discovery, RAG, platform APIs
- [production-deployment.md](production-deployment.md) – Deployment, JWT, monitoring  
- [specs/002-ui-routers-improvement/research.md](specs/002-ui-routers-improvement/research.md) – Platform API verification  
- [database/migrations/003_biddinghub_merge.sql](database/migrations/003_biddinghub_merge.sql) – `platform_credentials` schema

