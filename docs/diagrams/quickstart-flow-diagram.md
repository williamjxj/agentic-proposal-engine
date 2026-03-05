# Quick Start Setup Flow

Visual guide for setting up Auto Bidder in under 5 minutes.

## Setup Flow Diagram

```mermaid
graph TD
    Start([Start Setup]) --> Clone[Clone Repository]
    Clone --> CheckDocker{Docker Installed?}
    
    CheckDocker -->|Yes| DockerPath[Docker Setup Path]
    CheckDocker -->|No| ManualPath[Manual Setup Path]
    
    subgraph "Docker Setup (Recommended)"
        DockerPath --> CopyEnv1[Copy .env.example to .env]
        CopyEnv1 --> ConfigEnv1[Configure JWT_SECRET]
        ConfigEnv1 --> DockerUp[Run: docker-compose up -d]
        DockerUp --> WaitDB[Wait for PostgreSQL]
        WaitDB --> RunMigrations1[Run: docker-compose exec backend python -m scripts.run_migrations]
        RunMigrations1 --> StartBackend1[Backend running on :8000]
        StartBackend1 --> InstallFrontend1[Run: cd frontend && npm install]
        InstallFrontend1 --> StartFrontend1[Run: npm run dev]
        StartFrontend1 --> Success1[✅ App running on :3000]
    end
    
    subgraph "Manual Setup"
        ManualPath --> InstallPG[Install PostgreSQL 15+]
        InstallPG --> CreateDB[Create Database: auto_bidder_dev]
        CreateDB --> CopyEnv2[Copy .env.example to .env]
        CopyEnv2 --> ConfigEnv2[Configure DATABASE_URL & JWT_SECRET]
        ConfigEnv2 --> CreateVenv[Create Python venv]
        CreateVenv --> InstallBackend[pip install -r requirements.txt]
        InstallBackend --> RunMigrations2[Run migrations]
        RunMigrations2 --> StartBackend2[uvicorn app.main:app --reload]
        StartBackend2 --> InstallFrontend2[cd frontend && npm install]
        InstallFrontend2 --> StartFrontend2[npm run dev]
        StartFrontend2 --> Success2[✅ App running on :3000]
    end
    
    Success1 --> Verify[Open http://localhost:3000]
    Success2 --> Verify
    Verify --> TestSignup[Test: Create Account]
    TestSignup --> TestLogin[Test: Login]
    TestLogin --> TestProposal[Test: Generate Proposal]
    TestProposal --> Done([🎉 Setup Complete!])
    
    style Start fill:#00d4ff,stroke:#333,stroke-width:3px
    style Done fill:#4caf50,stroke:#333,stroke-width:3px
    style Success1 fill:#10a37f,stroke:#333,stroke-width:2px
    style Success2 fill:#10a37f,stroke:#333,stroke-width:2px
    style DockerPath fill:#2496ed,stroke:#333,stroke-width:2px
    style ManualPath fill:#ff9800,stroke:#333,stroke-width:2px
```

## Prerequisites Checklist

- [ ] Node.js 18+ installed
- [ ] Python 3.11+ installed
- [ ] Docker & Docker Compose (recommended)
- [ ] Git installed
- [ ] OpenAI API key (optional, for AI features)

## Environment Variables to Configure

```bash
# Backend .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auto_bidder_dev
JWT_SECRET=<generate-64-byte-secure-token>
OPENAI_API_KEY=sk-...
DEEPSEEK_API_KEY=...

# Frontend .env.local
NEXT_PUBLIC_API_URL=http://localhost:8000
```

## Generate JWT Secret

```bash
python -c "import secrets; print(secrets.token_urlsafe(64))"
```

## Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| Port 5432 already in use | Stop existing PostgreSQL: `brew services stop postgresql` |
| Port 8000 already in use | Kill process: `lsof -ti:8000 \| xargs kill -9` |
| Python version mismatch | Use pyenv: `pyenv install 3.11 && pyenv local 3.11` |
| npm install fails | Clear cache: `npm cache clean --force` |
| Database connection fails | Check PostgreSQL is running: `docker ps` or `pg_isready` |

## Verification Steps

1. **Backend Health Check**
   ```bash
   curl http://localhost:8000/health
   # Expected: {"status":"healthy"}
   ```

2. **Frontend Loading**
   - Navigate to http://localhost:3000
   - Should see login page

3. **Database Migrations**
   ```bash
   docker-compose exec backend python -c "import asyncpg; print('DB connected')"
   ```

4. **Full Stack Test**
   - Create account
   - Login
   - Navigate to dashboard
   - Try uploading a document
   - Generate a test proposal

## Next Steps After Setup

1. 📚 Read [architecture-diagram.md](./architecture-diagram.md)
2. 🔐 Review [setup-auth.md](../setup-auth.md)
3. 📋 Check [implementation-progress.md](../implementation-progress.md)
4. 📊 Explore [API Contracts](../../specs/001-auto-bidder-improvements/contracts/)
