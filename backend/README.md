# Auto-Bidder Backend (Python AI Service)

Python FastAPI service powering AI features: RAG knowledge base, AI proposal generation, and job discovery.

## Tech Stack

- **Framework**: FastAPI 0.104+
- **Database**: PostgreSQL (asyncpg)
- **Vector DB**: ChromaDB 0.4+
- **RAG**: LangChain 0.1+ with per-user collections
- **LLM**: OpenAI GPT-4-turbo / DeepSeek
- **Embeddings**: SentenceTransformer (all-MiniLM-L6-v2) or OpenAI
- **Job Discovery**: HuggingFace datasets (USE_HF_DATASET=true); web scraping planned
- **Document Processing**: pypdf, python-docx

## Quick Start

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Setup environment variables
cp .env.example .env

# Run development server
uvicorn app.main:app --reload --port 8000

# Run tests
pytest

# Lint and format
ruff check .
black .
```

## Environment Variables

See `.env.example` for required configuration.

## API Documentation

Once running, visit:
- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc

## Project Structure

```
app/
├── main.py              # FastAPI entry point
├── config.py            # Environment configuration
├── routers/             # API route handlers
├── services/            # Business logic
├── models/              # Pydantic schemas
└── core/                # Core utilities
```

## Key Endpoints

- `GET /api/projects/list` – List jobs (from HuggingFace)
- `POST /api/projects/discover` – Discover jobs by keywords
- `POST /api/proposals/generate-from-job` – AI proposal generation
- `GET /api/documents` – Knowledge base documents

## Development

See [docs/setup-and-run.md](../docs/setup-and-run.md) for full setup. Requires Docker (PostgreSQL + ChromaDB), JWT_SECRET, and LLM API keys.
