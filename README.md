# Auto-Bidder Platform 🤖

An AI-powered auto-bidding platform that reduces proposal writing time from 30 minutes to 2 minutes using RAG-based knowledge retrieval and AI proposal generation.

## 📸 Screenshots & Preview

<div align="center">

### Dashboard Overview
![Dashboard](./assets/images/dashboard.png)
*Main dashboard showing active projects and key metrics*

### Projects Management
![Projects](./assets/images/projects.png)
*Browse and track jobs you're bidding on*

### Proposals
![Proposals](./assets/images/proposals.png)
*AI-powered proposal generation with RAG, structured job context, and one-click email delivery*

### Knowledge Base
![Knowledge Base](./assets/images/knowledge-base.png)
*Upload portfolio documents, case studies, and team profiles for AI context*

### AI Strategies
![Strategies](./assets/images/strategies.png)
*Create reusable AI prompt templates for different proposal tones*

### Keywords Management
![Keywords](./assets/images/keywords.png)
*Filter jobs and emphasize your skills in AI-generated proposals*

### Analytics Dashboard
![Analytics](./assets/images/analytics.png)
*Performance analytics, win rate tracking, and time savings metrics*

### Settings
![Settings](./assets/images/settings.png)
*Account preferences and application configuration*

</div>

## 🎯 Key Features

- **🔍 Job Discovery** - Import jobs from HuggingFace datasets with automated ETL
- **📚 Knowledge Base** - Upload portfolio docs for RAG-powered context (ChromaDB + LangChain)
- **🤖 AI Proposals** - Generate personalized proposals in 60 seconds using GPT-4/DeepSeek
- **📧 Email Delivery** - Auto-send HTML emails from verified domain with BCC archiving
- **🎯 Smart Strategies** - Reusable AI prompt templates for different tones
- **🔑 Keyword Filtering** - Filter jobs and emphasize skills in proposals
- **📊 Analytics** - Track win rates, performance metrics, and time savings

**Quick Workflow:** Discover Jobs → Upload Portfolio → Generate AI Proposal → Submit via Email

📄 [Detailed workflow docs](./docs/diagrams/workflow-diagram.md) | [Email system guide](./docs/email-system.md)

## 🏗️ Tech Stack

**Frontend:** Next.js 15 • React 19 • TypeScript • TailwindCSS 4 • shadcn/ui • TanStack Query

**Backend:** FastAPI • PostgreSQL • ChromaDB • LangChain • OpenAI/DeepSeek • JWT Auth • Resend (Email)

**Infrastructure:** Docker Compose • Vercel • Railway

📄 [Architecture docs](./docs/diagrams/architecture-diagram.md)

## 🚀 Quick Start

**Prerequisites:** Node.js 20+ • Python 3.11+ • Docker

```bash
# Start services
docker-compose up -d

# Frontend
cd frontend && npm install && cp .env.example .env.local
npm run dev  # http://localhost:3000

# Backend
cd backend && pip install -r requirements.txt && cp .env.example .env
# Edit .env: Add JWT_SECRET, OPENAI_API_KEY/DEEPSEEK_API_KEY, RESEND_API_KEY
uvicorn app.main:app --reload --port 8000
```

**Required ENV vars:** `JWT_SECRET` • `OPENAI_API_KEY` or `DEEPSEEK_API_KEY` • `RESEND_API_KEY` • `DATABASE_URL`

📄 [Complete setup guide](./docs/setup-and-run.md) | [Auth setup](./docs/setup-auth.md) | [Email config](./docs/email-system.md)

## 🔐 Security

**JWT Authentication** with bcrypt password hashing, 30-day token expiration, and secure secrets.

📄 [Auth setup guide](./docs/setup-auth.md) | [Auth flow diagram](./docs/diagrams/auth-flow-diagram.md)

## 📚 Documentation

| Guide | Description |
|-------|-------------|
| [Setup & Run](./docs/setup-and-run.md) | 10-minute quickstart |
| [User Guide](./docs/user-guides.md) | How to use the platform |
| [Proposal Workflow](./docs/proposal-workflow-ui.md) | End-to-end proposal generation |
| [Email System](./docs/email-system.md) | Email config & troubleshooting |
| [Auth Setup](./docs/setup-auth.md) | JWT authentication |
| [Architecture](./docs/diagrams/) | System diagrams |

📄 [Full documentation index](./docs/readme.md)

## 🚢 Deployment

**Frontend:** Vercel • **Backend:** Railway/Fly.io • **Database:** PostgreSQL

📄 [Railway deployment guide (Recommended)](./docs/railway-deployment-guide.md) | [Production deployment guide](./docs/production-deployment.md)

## 📄 License

[MIT License](./LICENSE)

## 🔗 Links

- [Documentation](./docs/readme.md)

---

**Built with ❤️ by the Auto Bidder Team**
