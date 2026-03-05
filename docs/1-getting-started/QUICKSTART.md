# 🚀 Quick Start Guide

**Get your Auto-Bidder platform running in 10 minutes**

---

## 📋 Prerequisites

Before starting, ensure you have:

- ✅ **Node.js 20+** installed (`node --version`)
- ✅ **Python 3.11+** (3.12+ recommended) installed (`python --version`)
- ✅ **Docker & Docker Compose** installed
- ✅ **Git** installed
- ⏳ **DeepSeek or OpenAI API key** (for LLM)

---

## 🛠️ Step 1: Infrastructure Setup

### 1. Start PostgreSQL and ChromaDB

We use Docker for local database and vector storage.

```bash
cd auto-bidder
docker-compose up -d
```

This starts:
- PostgreSQL on port 5432
- ChromaDB on port 8001

### 2. Apply Database Migrations

```bash
# Enable PostgreSQL extensions
docker exec -i auto-bidder-postgres psql -U postgres -d auto_bidder_dev -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\"; CREATE EXTENSION IF NOT EXISTS \"pg_trgm\";"

# Apply migrations
docker exec -i auto-bidder-postgres psql -U postgres -d auto_bidder_dev < database/migrations/006_custom_auth_users.sql
```

### 3. Get API Credentials

- **DeepSeek**: Get your API key at [platform.deepseek.com](https://platform.deepseek.com)
- Or **OpenAI**: Get your key at [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

---

## ⚙️ Step 2: Configure Environment

### Frontend Environment

```bash
cd frontend
cp .env.example .env.local
```

Edit `.env.local`:

```bash
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
PYTHON_AI_SERVICE_URL=http://localhost:8000
```

### Backend Environment

```bash
cd ../backend
cp .env.example .env
```

Edit `.env`:

```bash
# Database (docker-compose PostgreSQL)
DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/auto_bidder_dev

# JWT Authentication
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=10080

# LLM Provider (choose one)
LLM_PROVIDER=deepseek
DEEPSEEK_API_KEY=sk-your-deepseek-key-here
DEEPSEEK_MODEL=deepseek-chat

# Or use OpenAI
# LLM_PROVIDER=openai
# OPENAI_API_KEY=sk-your-openai-key-here

# ChromaDB
CHROMA_PERSIST_DIR=./chroma_db
```

---

## 🏃 Step 3: Start the Application

### Terminal 1: Backend (Python)

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

You should see:
```
🚀 Auto-Bidder AI Service starting...
✅ Database connection pool initialized
```

### Terminal 2: Frontend (Next.js)

```bash
cd frontend
npm install
npm run dev
```

---

## ✅ Step 4: Verify Installation

1. **Backend Health**: Visit [http://localhost:8000/health](http://localhost:8000/health). Should see `{"status":"healthy"}`.
2. **API Docs**: Visit [http://localhost:8000/docs](http://localhost:8000/docs) for Swagger UI.
3. **Frontend Dashboard**: Visit [http://localhost:3000](http://localhost:3000). Create an account at `/signup`.
4. **Database**: Check tables with:
   ```bash
   docker exec -it auto-bidder-postgres psql -U postgres -d auto_bidder_dev -c "\dt"
   ```

---

## 🧪 Test Authentication

### Sign Up

1. Go to [http://localhost:3000/signup](http://localhost:3000/signup)
2. Create account with email and password (min 8 chars)
3. You'll be automatically logged in and redirected to dashboard

### Verify JWT Token

Open browser DevTools → Application → Local Storage → `auth_token`
- You should see a JWT token stored

### Test API with Token

```bash
# Replace YOUR_TOKEN with token from localStorage
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📖 User Workflow (3 Steps)

Once setup is complete:

1. **Upload Knowledge Base** → Go to **Knowledge Base**, upload portfolio PDFs/DOCX. The AI uses these for RAG context.
2. **Configure Strategy** → Go to **Strategies**, create or select a proposal tone (professional, casual, technical).
3. **Generate Proposals** → Go to **Projects** → Discover Jobs (HuggingFace) → Click "Generate Proposal" on a job card → AI generates draft.

See [Proposal Workflow Integration](../PROPOSAL_WORKFLOW_INTEGRATION.md) for the complete flow.

---

## 🐛 Troubleshooting

- **Backend import errors**: Ensure your virtual environment is active and `pip install -r requirements.txt` was successful.
- **Port conflicts**: If port 3000 or 8000 is used, kill the process using `lsof -ti:PORT | xargs kill -9`.
- **Database connection**: Ensure Docker containers are running (`docker ps`).

---

**Ready to Build?** Check [diagrams/architecture-diagram.md](../diagrams/architecture-diagram.md) for system architecture.
