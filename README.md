# Auto-Bidder Platform 🤖

An AI-powered auto-bidding platform that reduces proposal writing time from 30 minutes to 2 minutes using RAG-based knowledge retrieval and AI proposal generation.

## 📸 Screenshots & Preview

> **Note**: Add your application screenshots here to showcase the platform's capabilities

<div align="center">

### Dashboard Overview
![Dashboard](./assets/images/dashboard.png)
*Main dashboard showing active projects and metrics*

### Analytics
![Analytics](./assets/images/analytics.png)
*Performance analytics and win rate tracking*

### Proposal Builder
<!-- ![Proposal Builder](./assets/images/proposal-builder.png) -->
*AI-powered proposal generation with RAG, structured job context, and one-click email delivery*

</div>

**📍 Current Navigation Options:**
- Dashboard - Where you are now (overview & stats)
- Projects - Track jobs you're bidding on
- Proposals - Generate & manage AI proposals
- Knowledge Base - Upload your portfolio documents ⭐ Start here
- Strategies - AI prompt templates for different tones
- Keywords - Filter relevant jobs
- Analytics - Win rates & performance metrics
- Settings - Account & preferences

## 🎯 Core Features

- **Automated Job Discovery**: Discover jobs from HuggingFace datasets (Projects → Discover Jobs); web scraping planned for production
- **Smart Knowledge Base**: Upload portfolio documents, case studies, and team profiles for AI context (RAG)
- **AI Proposal Generation**: Generate personalized proposals using job description, structured job analysis, company context, your keywords, and RAG. One-click AI Generate in under 60 seconds
- **Proposal Email Delivery**: Submit Proposal saves to DB and sends a formal HTML email from `service@bestitconsulting.ca` (verified domain) to the customer via Resend. Customers can reply directly. **BCC archiving active** - all sent proposals automatically copied to business Gmail. See [docs/email-system.md](./docs/email-system.md)
- **Bidding Strategies**: Create reusable AI prompt templates for different proposal tones and focus areas
- **Keyword Management**: Filter jobs and emphasize your skills in AI-generated proposals
- **Analytics Dashboard**: Track win rates, platform performance, and time savings

### How It Works

1. **Discover** jobs from HuggingFace (Projects → Discover) or browse persisted projects
2. **Generate Proposal** — job context (title, description, company, structured analysis) loads via sessionStorage or API
3. **AI Generate** — RAG (your portfolio) + job context + your keywords + strategy → tailored proposal draft
4. **Submit Proposal** — saves to DB, sends formal HTML email from `service@bestitconsulting.ca` to customer (or fallback email). Customers can reply directly. BCC copies archived automatically. See [docs/email-system.md](./docs/email-system.md)

📄 **[View detailed workflow documentation](./docs/diagrams/workflow-diagram.md)**

## 🏗️ Architecture

This is a **full-stack monorepo** with two main components:

### System Overview

<!-- ![Architecture Diagram](./assets/images/architecture-diagram.png) -->
*Diagram coming soon: Full-stack system architecture showing frontend, backend, database, and external services*

📄 **[View detailed architecture documentation](./docs/diagrams/architecture-diagram.md)**

### Frontend (Next.js 15)

- **Framework**: Next.js 15 with App Router
- **UI**: React 19 + shadcn/ui + TailwindCSS 4
- **State**: TanStack Query for server state
- **Auth**: Custom JWT Authentication
- **Database**: PostgreSQL via docker-compose

### Backend (Python FastAPI)

- **Framework**: FastAPI 0.109+
- **Database**: PostgreSQL with asyncpg
- **Auth**: JWT with bcrypt password hashing
- **Vector DB**: ChromaDB (local persist mode recommended; Docker requires client upgrade)
- **RAG**: LangChain for document processing and similarity search
- **LLM**: OpenAI GPT-4-turbo / DeepSeek
- **Email**: Resend for proposal submission and job notifications
  - Verified domain: `service@bestitconsulting.ca`
  - Supports customer replies via email hosting
  - BCC archiving active for all sent proposals
  - See [docs/email-system.md](./docs/email-system.md)
- **Job Discovery**: HuggingFace datasets (e.g. `jacob-hugging-face/job-descriptions`); Playwright planned for production scraping

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Python 3.11+
- Docker & Docker Compose

📄 **[View detailed setup flow diagram](./docs/diagrams/quickstart-flow-diagram.md)**

### Setup (5 minutes)

```bash
# Clone the repository
git clone <repo-url> auto-bidder
cd auto-bidder

# Start database services (PostgreSQL + ChromaDB)
docker-compose up -d

# Setup frontend
cd frontend
npm install
cp .env.example .env.local
# Edit .env.local - set NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
npm run dev  # Runs on :3000

# Setup backend (new terminal)
cd backend
uv sync   # or: python -m venv venv && source venv/bin/activate && pip install -r requirements.txt
cp .env.example .env
# Edit .env with API keys, JWT secret, RESEND_API_KEY (for proposal emails)
uv run uvicorn app.main:app --reload --port 8000
```

### Environment Variables

**Frontend** (`.env.local`):

- `NEXT_PUBLIC_BACKEND_API_URL`: Backend API URL (default: http://localhost:8000)
- `PYTHON_AI_SERVICE_URL`: Python service URL (default: http://localhost:8000)

**Backend** (`.env`):

- `DATABASE_URL`: PostgreSQL connection string (e.g. `postgresql://postgres:postgres@127.0.0.1:5432/auto_bidder_dev`)
- `JWT_SECRET`: Secret key for JWT tokens (generate with: `openssl rand -hex 32`)
- `DEEPSEEK_API_KEY` or `OPENAI_API_KEY`: LLM provider API key
- `CHROMA_PERSIST_DIR`: ChromaDB storage path (default: ./chroma_db). Use local mode; Docker ChromaDB requires client upgrade
- `RESEND_API_KEY`: Resend.com API key for sending proposal emails
- `FROM_EMAIL`: Email sender address - must use `service@bestitconsulting.ca` (verified domain)
- `PROPOSAL_SUBMIT_EMAIL`: Default receiver email for proposals when customer email not found (default: bestitconsultingca@gmail.com)

## 🔐 Security & Authentication

Auto Bidder uses **JWT-based authentication** with secure password hashing via bcrypt.

<!-- ![Authentication Flow](./assets/images/auth-flow-diagram.png) -->
*Diagram coming soon: JWT authentication sequence diagram*

📄 **[View detailed auth flow documentation](./docs/diagrams/auth-flow-diagram.md)**

### Security Features

- ✅ **Password Hashing**: bcrypt with automatic salt generation
- ✅ **JWT Tokens**: Stateless authentication with 30-day expiration
- ✅ **Token Validation**: All protected endpoints verify JWT signature
- ✅ **Password Requirements**: 8-72 character length enforced
- ✅ **Secure Secrets**: 64-byte cryptographically secure JWT_SECRET

### Generate JWT Secret

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

Add the generated secret to `backend/.env`:
```bash
JWT_SECRET=<your-generated-secret-here>
```

## 📚 Documentation

Documentation is in [`docs/`](./docs/). See [docs/readme.md](./docs/readme.md) for the full index.

| Doc | Purpose |
|-----|---------|
| [setup-and-run](./docs/setup-and-run.md) | Get the app running in ~10 minutes |
| [setup-auth](./docs/setup-auth.md) | JWT and authentication setup |
| [user-guides](./docs/user-guides.md) | How to start and use the app in the UI |
| [proposal-workflow-ui](./docs/proposal-workflow-ui.md) | Discover Jobs → Generate Proposal → Submit (with email) |
| [email-system](./docs/email-system.md) | Complete email configuration, BCC archiving, and troubleshooting guide |
| [huggingface-job-discovery](./docs/huggingface-job-discovery.md) | Job discovery (HuggingFace datasets) |
| [chromadb-setup](./docs/chromadb-setup.md) | ChromaDB local vs Docker setup |
| [web-scraping-status](./docs/web-scraping-status.md) | Web scraping status (not implemented) |
| [diagrams/](./docs/diagrams/) | Architecture, auth, workflow diagrams |
```
auto-bidder/
├── frontend/              # Next.js 15 application
│   ├── src/
│   │   ├── app/           # Next.js App Router
│   │   ├── components/    # React components
│   │   ├── lib/           # Utilities
│   │   └── hooks/         # Custom hooks
│   └── package.json
├── backend/               # Python AI service
│   ├── app/
│   │   ├── main.py        # FastAPI entry
│   │   ├── routers/       # API routes
│   │   ├── services/      # Business logic
│   │   └── models/        # Pydantic schemas
│   └── requirements.txt
├── database/              # Database migrations
│   ├── migrations/
│   └── seed/
├── shared/                # Shared types
│   └── types/
├── scripts/               # Automation scripts
│   ├── setup/
│   └── deploy/
└── docs/                  # Documentation
```

## 🧪 Testing

```bash
# Frontend tests
cd frontend
npm test

# Backend tests
cd backend
pytest

# E2E tests
npm run test:e2e
```

## 🚢 Deployment

### Frontend (Vercel)

```bash
cd frontend
vercel deploy
```

### Backend (Railway)

```bash
cd backend
railway up
```

See [docs/production-deployment.md](./docs/production-deployment.md) for detailed deployment.

## 📊 Success Metrics

- **Time Savings**: 25+ minutes per proposal (target: 30 min → 2 min)
- **Proposal Quality**: 95%+ accuracy in formatting and completeness
- **RAG Relevance**: 80%+ of proposals cite relevant past projects
- **Win Rate**: 20% increase in proposal acceptance (tracked)
- **User Activation**: 70% of signups generate first proposal within 24h

## 🛠️ Tech Stack

**Frontend**:

- Next.js 15.3.5
- React 19
- TypeScript 5.x
- TailwindCSS 4
- shadcn/ui
- TanStack Query 5.x

**Backend**:

- Python 3.11+
- FastAPI 0.109+
- PostgreSQL with asyncpg
- JWT Authentication (python-jose + passlib)
- ChromaDB 0.4+ (local persist) or 0.5+ (Docker HTTP)
- LangChain for RAG and LLM
- OpenAI GPT-4-turbo / DeepSeek
- Resend for email (proposal submission, job notifications)
- Playwright + BeautifulSoup
- pypdf, python-docx, sentence-transformers

**Infrastructure**:

- PostgreSQL (docker-compose)
- ChromaDB (docker-compose)
- Vercel (frontend hosting)
- Railway/Fly.io (backend hosting)

## 📄 License

[MIT License](./LICENSE)

## 🔗 Links

- [Documentation](./docs/readme.md)

---

**Built with ❤️ by the Auto Bidder Team**
