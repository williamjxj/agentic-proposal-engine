# Railway Deployment Guide

Complete guide to deploy Auto-Bidder backend and databases to Railway.

## 📋 Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **Railway CLI** (optional but recommended):
   ```bash
   npm install -g @railway/cli
   # or
   brew install railway
   ```
3. **GitHub Repository**: Your code should be pushed to GitHub

---

## 🚀 Step-by-Step Deployment

### Step 1: Create New Railway Project

**Option A: Via Railway CLI**
```bash
cd /Users/william.jiang/my-apps/auto-bidder
railway login
railway init
# Follow prompts to create a new project
```

**Option B: Via Railway Dashboard**
1. Go to [railway.app/new](https://railway.app/new)
2. Click "Deploy from GitHub repo"
3. Select your `williamjxj/AutoBidder` repository
4. Choose your branch (e.g., `main` or `007-govt-loan-business-plan`)

---

### Step 2: Add PostgreSQL Database

1. In your Railway project dashboard, click **"+ New"**
2. Select **"Database"** → **"PostgreSQL"**
3. Railway will automatically:
   - Provision a PostgreSQL instance
   - Generate a `DATABASE_URL` connection string
   - Make it available to your services

**Note the connection details:**
- Railway provides these environment variables automatically:
  - `DATABASE_URL` (full connection string)
  - `PGHOST`, `PGPORT`, `PGUSER`, `PGPASSWORD`, `PGDATABASE` (individual components)

---

### Step 3: Add ChromaDB Service

Since ChromaDB needs persistent storage, add it as a separate service:

1. In Railway dashboard, click **"+ New"** → **"Empty Service"**
2. Name it `chromadb`
3. Go to **Settings** → **Deploy**
4. Set **Docker Image**: `chromadb/chroma:latest`
5. Go to **Variables** and add:
   ```
   IS_PERSISTENT=TRUE
   ANONYMIZED_TELEMETRY=FALSE
   ```
6. Go to **Settings** → **Networking**
   - Click **"Generate Domain"** to get a public URL
   - Note the internal URL: `chromadb.railway.internal:8000`

---

### Step 4: Deploy FastAPI Backend

1. In Railway dashboard, click **"+ New"** → **"GitHub Repo"**
2. Select your repository and branch
3. Railway will auto-detect the `railway.toml` configuration
4. Go to **Settings** → **Build**:
   - Build method: `Dockerfile`
   - Dockerfile path: `backend/Dockerfile`
   - Build context: `backend`

---

### Step 5: Configure Environment Variables

In the FastAPI service settings, go to **Variables** and add:

**Required:**
```bash
# Database (automatically set by Railway if PostgreSQL is added)
DATABASE_URL=${{Postgres.DATABASE_URL}}

# ChromaDB (use internal Railway URL)
CHROMA_HOST=chromadb.railway.internal
CHROMA_PORT=8000

# JWT Authentication
JWT_SECRET=<generate-secure-random-string>

# AI Provider (choose one)
OPENAI_API_KEY=<your-openai-key>
# OR
DEEPSEEK_API_KEY=<your-deepseek-key>
LLM_PROVIDER=deepseek

# Email (if using autonomous features)
RESEND_API_KEY=<your-resend-key>

# Application
ENVIRONMENT=production
LOG_LEVEL=INFO
CORS_ORIGINS=https://your-frontend-domain.vercel.app,https://auto-bidder.vercel.app
```

**Optional:**
```bash
# Autonomous Features
AUTO_DISCOVERY_ENABLED=true
AUTO_PROPOSAL_THRESHOLD=0.85

# ETL Configuration
ETL_USE_PERSISTENCE=true
HF_ETL_SCHEDULE_HOURS=168
FREELANCER_ETL_SCHEDULE_HOURS=24

# Project Filtering
PROJECT_FILTER_KEYWORDS=python,fastapi,nextjs,react,typescript

# File Storage
MAX_FILE_SIZE_MB=50
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

**Railway Template Variables:**
- `${{Postgres.DATABASE_URL}}` - References your PostgreSQL database
- `chromadb.railway.internal` - Internal networking between services

---

### Step 6: Run Database Migrations

**Option A: Via Railway CLI**
```bash
# Connect to your Railway PostgreSQL
railway connect Postgres

# Once connected, run migrations
\i database/migrations/001_initial_schema.sql
\i database/migrations/002_add_huggingface_etl.sql
\i database/migrations/003_add_freelancer_etl.sql
\i database/migrations/004_workflow_optimization.sql
\q
```

**Option B: Via psql with DATABASE_URL**
```bash
# Get your DATABASE_URL from Railway dashboard
railway variables --json | jq -r '.DATABASE_URL'

# Run migrations
psql "$DATABASE_URL" < database/migrations/001_initial_schema.sql
psql "$DATABASE_URL" < database/migrations/002_add_huggingface_etl.sql
psql "$DATABASE_URL" < database/migrations/003_add_freelancer_etl.sql
psql "$DATABASE_URL" < database/migrations/004_workflow_optimization.sql
```

**Option C: Create a Migration Script**

Create `backend/scripts/run_migrations.py`:
```python
import asyncpg
import os
from pathlib import Path

async def run_migrations():
    database_url = os.getenv("DATABASE_URL")
    conn = await asyncpg.connect(database_url)
    
    migrations_dir = Path(__file__).parent.parent.parent / "database" / "migrations"
    migration_files = sorted(migrations_dir.glob("*.sql"))
    
    for migration_file in migration_files:
        print(f"Running {migration_file.name}...")
        sql = migration_file.read_text()
        await conn.execute(sql)
        print(f"✓ {migration_file.name} completed")
    
    await conn.close()

if __name__ == "__main__":
    import asyncio
    asyncio.run(run_migrations())
```

Then run via Railway CLI:
```bash
railway run python backend/scripts/run_migrations.py
```

---

### Step 7: Generate Public URL

1. Go to your FastAPI service **Settings** → **Networking**
2. Click **"Generate Domain"**
3. Railway will create a URL like: `https://autobidder-production.up.railway.app`
4. Test your API: `https://your-domain.up.railway.app/health`

---

### Step 8: Connect Frontend to Backend

Update your Next.js frontend environment variables (in Vercel or locally):

```bash
# .env.local or Vercel environment variables
NEXT_PUBLIC_API_URL=https://your-backend.up.railway.app
PYTHON_AI_SERVICE_URL=https://your-backend.up.railway.app
```

---

## 🔧 Management Commands

### View Logs
```bash
railway logs
# or
railway logs --service backend
```

### Connect to Database
```bash
railway connect Postgres
```

### Run Commands in Context
```bash
railway run python backend/scripts/some_script.py
```

### Deploy Updates
```bash
# Push to GitHub - Railway auto-deploys
git push origin main

# Or manually trigger
railway up
```

---

## 💰 Cost Estimation

**Railway Pricing (as of March 2026):**

**Hobby Plan** ($5/month):
- $5 credit/month
- ~10GB storage
- Good for development/staging

**Pro Plan** ($20/month):
- $20 credit/month
- Pay-as-you-go after credits
- Better for production

**Typical Monthly Costs:**
- FastAPI Backend: $3-8/month (depending on traffic)
- PostgreSQL: $2-5/month (depending on storage)
- ChromaDB: $3-8/month (depending on usage)
- **Total: ~$8-21/month** for moderate usage

---

## 🔄 CI/CD Setup

Railway automatically deploys when you push to your GitHub branch.

**Customize deployment triggers:**

1. Go to **Settings** → **Builds**
2. Configure:
   - **Deploy on push**: Enable/disable auto-deploy
   - **Branch**: Specify deployment branch
   - **Path filters**: Only deploy on backend changes

Example path filter to only deploy when backend changes:
```
backend/**
database/migrations/**
railway.toml
```

---

## 📊 Monitoring & Health Checks

Railway provides built-in monitoring:

1. **Metrics Dashboard**: CPU, Memory, Network usage
2. **Health Checks**: Configured in `railway.toml`
3. **Logs**: Real-time log streaming

**Configure Health Check Path:**
Ensure your FastAPI app has a health endpoint (already exists in `app/routers/health.py`).

---

## 🛡️ Security Best Practices

### 1. Environment Variables
- ✅ Never commit secrets to Git
- ✅ Use Railway's environment variables
- ✅ Rotate JWT secrets regularly

### 2. Database
- ✅ Railway PostgreSQL includes SSL by default
- ✅ Use connection pooling
- ✅ Enable backups in Railway dashboard

### 3. CORS
- ✅ Restrict CORS origins to your frontend domains only
- ✅ Never use `*` in production

### 4. Rate Limiting
Consider adding rate limiting middleware to your FastAPI app:
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter
```

---

## 🔍 Troubleshooting

### Issue: Service won't start

**Check:**
1. View logs: `railway logs`
2. Verify environment variables are set
3. Check health check endpoint is responding
4. Verify Dockerfile builds locally: `docker build -t test ./backend`

### Issue: Database connection failed

**Solutions:**
1. Verify `DATABASE_URL` is set correctly
2. Check if PostgreSQL service is running
3. Test connection: `railway connect Postgres`
4. Ensure migrations have been run

### Issue: ChromaDB connection timeout

**Solutions:**
1. Verify ChromaDB service is running
2. Use internal URL: `chromadb.railway.internal:8000`
3. Check firewall/networking settings
4. Verify `CHROMA_HOST` and `CHROMA_PORT` variables

### Issue: High costs

**Optimization:**
1. Enable sleep mode for non-production services
2. Optimize Docker image size
3. Use caching for dependencies
4. Scale down resources if over-provisioned

---

## 📚 Additional Resources

- [Railway Documentation](https://docs.railway.app)
- [Railway Discord Community](https://discord.gg/railway)
- [Railway Templates](https://railway.app/templates)
- [PostgreSQL on Railway](https://docs.railway.app/databases/postgresql)

---

## 🎯 Next Steps

After deploying backend to Railway:

1. **Deploy Frontend to Vercel**: See `docs/vercel-deployment-guide.md`
2. **Set up monitoring**: Configure alerts and uptime monitoring
3. **Enable backups**: Configure database backup schedule
4. **Add custom domain**: Configure DNS for your production domain
5. **Set up staging environment**: Create separate Railway project for staging

---

## 📝 Quick Reference

```bash
# Login
railway login

# Link to project
railway link

# View logs
railway logs

# Deploy
railway up

# Get environment variables
railway variables

# Connect to database
railway connect Postgres

# Run command in Railway context
railway run <command>

# Open dashboard
railway open
```

---

## ✅ Deployment Checklist

- [ ] Railway account created
- [ ] GitHub repository connected
- [ ] PostgreSQL database added
- [ ] ChromaDB service configured
- [ ] FastAPI service deployed
- [ ] All environment variables set
- [ ] Database migrations run
- [ ] Health check endpoint responding
- [ ] Public domain generated
- [ ] Frontend connected to backend API
- [ ] CORS configured correctly
- [ ] Logs verified (no errors)
- [ ] Test API endpoints working
- [ ] Monitoring dashboard reviewed
