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
*Coming soon: AI-powered proposal generation interface*

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

- **Automated Job Discovery**: Scrape and collect relevant freelance jobs from multiple platforms
- **Smart Knowledge Base**: Upload portfolio documents, case studies, and team profiles for AI context
- **AI Proposal Generation**: Generate personalized, evidence-based proposals in under 60 seconds
- **Bidding Strategies**: Create reusable AI prompt templates for different proposal styles
- **Keyword Management**: Filter jobs based on your expertise and preferences
- **Analytics Dashboard**: Track win rates, platform performance, and time savings

### How It Works

<!-- ![Workflow Diagram](./assets/images/workflow-diagram.png) -->
*Diagram coming soon: 7-step proposal generation workflow*

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

- **Framework**: FastAPI 0.104+
- **Database**: PostgreSQL with asyncpg
- **Auth**: JWT with bcrypt password hashing
- **Vector DB**: ChromaDB for RAG
- **RAG**: LangChain for document processing
- **LLM**: OpenAI GPT-4-turbo / DeepSeek
- **Scraping**: Playwright + BeautifulSoup for job discovery

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
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your API keys and JWT secret
uvicorn app.main:app --reload --port 8000
```

### Environment Variables

**Frontend** (`.env.local`):

- `NEXT_PUBLIC_BACKEND_API_URL`: Backend API URL (default: http://localhost:8000)
- `PYTHON_AI_SERVICE_URL`: Python service URL (default: http://localhost:8000)

**Backend** (`.env`):

- `DATABASE_URL`: PostgreSQL connection string (default: postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/auto_bidder_dev)
- `JWT_SECRET`: Secret key for JWT tokens (generate with: `openssl rand -hex 32`)
- `DEEPSEEK_API_KEY`: Your DeepSeek API key (or use OpenAI)
- `CHROMA_PERSIST_DIR`: ChromaDB storage path (default: ./chroma_db)

## � Security & Authentication

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

## �📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

- [**START_HERE.md**](./docs/START_HERE.md) - Project overview and getting started
- [**implementation.md**](./docs/implementation.md) - 12-step implementation guide
- [**ARCHITECTURE_DIAGRAM.md**](./docs/ARCHITECTURE_DIAGRAM.md) - Visual system architecture
- [**METUP_AUTH.md**](./docs/SETUP_AUTH.md) - Quick start guide for authentication setup
- [**AUTH_MIGRATION.md**](./docs/AUTH_MIGRATION.md) - Details on PostgreSQL + JWT authentication
- [**ARCHITECTURE_DIAGRAM.md**](./docs/ARCHITECTURE_DIAGRAM.md) - Visual system architecture
- [**QUICKSTART.md**](./docs/1-getting-started/QUICKSTART.md) - Getting started guide
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

See [docs/DEPLOYMENT.md](./docs/DEPLOYMENT.md) for detailed deployment instructions.

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


**Backend**:

- Python 3.11+
- FastAPI 0.104+
- PostgreSQL with asyncpg
- JWT Authentication (python-jose + passlib)
- ChromaDB 0.4+
- LangChain 0.1+
- OpenAI GPT-4-turbo / DeepSeek
- Playwright + BeautifulSoup
- pypdf, python-docx

**Infrastructure**:

- PostgreSQL (docker-compose)
- ChromaDB (docker-compose)
- Vercel (frontend hosting)
- Railway/Fly.io (backend hostingmd](./docs/CONTRIBUTING.md) for development workflow and coding standards.

## 📄 License

[MIT License](./LICENSE)

## 🔗 Links

- [Documentation](./docs/)

---

**Built with ❤️ by the Auto Bidder Team**
