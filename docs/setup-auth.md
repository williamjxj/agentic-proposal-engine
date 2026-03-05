# JWT and Authentication Setup

**Purpose:** Configure JWT authentication and verify the auth system works.

---

## Prerequisites

- Docker & Docker Compose
- Python 3.11+
- Node.js 20+

---

## Step 1: Start Docker Services (PostgreSQL + ChromaDB)

```bash
cd auto-bidder
docker-compose up -d
```

Verify: `docker-compose ps` — PostgreSQL on 5432, ChromaDB on 8001.

---

## Step 2: Backend Setup

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

---

## Step 3: Start Backend and Frontend

**Backend:**
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

**Frontend (new terminal):**
```bash
cd frontend
npm install && npm run dev
```

---

## Step 4: Test Authentication

**UI:** Go to `http://localhost:3000` → Sign Up → Create account → Dashboard

**API (curl):**
```bash
# Signup
curl -X POST http://localhost:8000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123","full_name":"Test User"}'

# Login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}'

# Get user (use token from login)
curl -X GET http://localhost:8000/api/auth/me \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## Environment Variables

**Backend `.env`:**
```bash
DATABASE_URL=postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/auto_bidder_dev
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_ALGORITHM=HS256
JWT_EXPIRATION_MINUTES=10080
```

**Frontend `.env.local`:**
```bash
NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
PYTHON_AI_SERVICE_URL=http://localhost:8000
```

**Generate JWT secret for production:**
```bash
openssl rand -hex 32
```

---

## Current Auth: Custom JWT

- Custom `users` table in PostgreSQL
- JWT issued by FastAPI at `/api/auth/login`
- Frontend stores token in localStorage; sends `Authorization: Bearer <token>`
- No Supabase dependencies

---

## Common Issues

| Issue | Solution |
|------|----------|
| "Failed to create database pool" | `docker-compose ps` — ensure PostgreSQL running |
| "JWT_SECRET not found" | Add `JWT_SECRET` to `backend/.env` |
| "Network Error" / "Failed to fetch" | Backend running? Check `NEXT_PUBLIC_BACKEND_API_URL` |
| "Unauthorized" after login | Clear localStorage and login again |

---

**See also:** [setup-and-run.md](setup-and-run.md) for full quick start.
