# Quickstart: Auto-Bidder Improvements (001)

**Feature**: 001-auto-bidder-improvements
**Purpose**: Run and verify the improved proposal generation, draft recovery, and knowledge base flow.

## Prerequisites

- Docker (PostgreSQL, ChromaDB)
- Python 3.12+, Node 20+
- API keys: `DEEPSEEK_API_KEY` or `OPENAI_API_KEY`

## Setup

```bash
# 1. Start infrastructure
cd /Users/william.jiang/my-apps/auto-bidder
docker-compose up -d

# 2. Backend
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000

# 3. Frontend (new terminal)
cd frontend
npm install
npm run dev
```

## Verification Flow

### 1. Proposal Generation with RAG (FR-001, FR-002, FR-003)

1. Sign up / log in at http://localhost:3000
2. Upload a PDF/DOCX to Knowledge Base (case_studies or portfolio)
3. Wait for `processing_status: ready`
4. Go to Projects → Discover Jobs (keywords: e.g. "python", "fastapi")
5. Click "Generate Proposal" on a job card
6. Click "✨ AI Generate" — should call `POST /api/proposals/generate-from-job`
7. Verify: draft includes reference to portfolio content; tone matches strategy

### 2. Draft Recovery (FR-004, FR-005)

1. Start editing a proposal draft
2. Wait for "Saved" indicator (auto-save ~10s)
3. Close tab or simulate crash
4. Return to `/proposals/new` or draft URL
5. Verify: recovery prompt or draft restored

### 3. Document Status (FR-008, FR-009)

1. Upload document → `processing_status` visible in list
2. On failure (e.g. corrupt PDF): user-friendly error with suggestion

### 4. Rapid Requests (FR-010)

1. Trigger two "AI Generate" clicks in quick succession
2. Second request should get 429 or queue (no corruption)

## API Quick Test

```bash
# Get JWT (from login)
TOKEN="your-jwt"

# Generate proposal
curl -X POST "http://localhost:8000/api/proposals/generate-from-job" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "job_title": "Python Backend Developer",
    "job_description": "Build FastAPI service with RAG",
    "job_skills": ["Python", "FastAPI"]
  }'
```

## Key Files

| Area | Path |
|------|------|
| AI Service | backend/app/services/ai_service.py |
| Document Service | backend/app/services/document_service.py |
| Proposals Router | backend/app/routers/proposals.py |
| Proposal New Page | frontend/src/app/(dashboard)/proposals/new/page.tsx |
