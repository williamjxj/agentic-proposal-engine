# Setup and Run

**Purpose:** Get the Auto-Bidder platform running in ~10 minutes.

---

## Prerequisites

- Node.js 20+
- Python 3.11+ (3.12+ recommended)
- Docker & Docker Compose
- DeepSeek or OpenAI API key (for LLM)

---

## Step 1: Infrastructure

```bash
cd auto-bidder
docker-compose up -d
```

Apply migrations:
```bash
docker exec -i auto-bidder-postgres psql -U postgres -d auto_bidder_dev -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";"
docker exec -i auto-bidder-postgres psql -U postgres -d auto_bidder_dev < database/migrations/006_custom_auth_users.sql
```

---

## Step 2: Environment

**Frontend** (`frontend/.env.local`):
```bash
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
PYTHON_AI_SERVICE_URL=http://localhost:8000
```

**Backend** (`backend/.env`):
```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/auto_bidder_dev
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=10080
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-your-key
CHROMA_PERSIST_DIR=./chroma_db
```

---

## Step 3: Start Application

**Terminal 1 — Backend:**
```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

**Terminal 2 — Frontend:**
```bash
cd frontend
npm install
npm run dev
```

---

## Step 4: Verify

1. Backend: [http://localhost:8000/health](http://localhost:8000/health) → `{"status":"healthy"}`
2. API docs: [http://localhost:8000/docs](http://localhost:8000/docs)
3. Frontend: [http://localhost:3000](http://localhost:3000) → Sign up → Dashboard

---

## User Workflow (After Setup)

1. **Knowledge Base** — Upload portfolio PDFs/DOCX for RAG context
2. **Strategies** — Create proposal tone (professional, casual, technical)
3. **Projects** → Discover Jobs → Generate Proposal on a job card → AI draft

See [proposal-workflow-ui.md](proposal-workflow-ui.md) for the full flow.

---

## Troubleshooting

- **Backend import errors:** Activate venv, run `pip install -r requirements.txt`
- **Port conflicts:** `lsof -ti:3000 | xargs kill -9` (or 8000)
- **Database:** Ensure `docker ps` shows postgres and chromadb

---

**Next:** [user-guides.md](user-guides.md) for UI usage | [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md) for architecture
