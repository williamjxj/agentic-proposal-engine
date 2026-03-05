# Production Deployment Guide - Workflow Optimization

Complete guide for deploying the workflow optimization feature to production.

---

## 📋 Pre-Deployment Checklist

### Code Review
- [ ] All 71 completed tasks reviewed and tested
- [ ] No sensitive data in code
- [ ] Environment variables properly configured
- [ ] Error handling tested for all scenarios

### Database
- [ ] Migration scripts reviewed
- [ ] Backup strategy in place
- [ ] Database access controls configured
- [ ] Indexes optimized for performance

### Security
- [ ] JWT authentication properly configured
- [ ] CORS settings reviewed
- [ ] API rate limiting considered
- [ ] Sensitive endpoints protected

### Performance
- [ ] Navigation timing <500ms verified
- [ ] Auto-save interval optimized
- [ ] Database queries optimized
- [ ] CDN configured for static assets

---

## 🗄️ Database Setup

### 1. Apply Migrations

**Using docker-compose PostgreSQL:**
```bash
# Apply all migrations in order
for migration in database/migrations/*.sql; do
  docker exec -i auto-bidder-postgres psql -U postgres -d auto_bidder_dev < "$migration"
done
```

**Using hosted PostgreSQL (Neon, AWS RDS, etc.):**
```bash
psql $DATABASE_URL < database/migrations/004_workflow_optimization.sql
```

### 2. Verify Tables Created

```sql
SELECT tablename FROM pg_tables 
WHERE tablename IN ('user_session_states', 'draft_work', 'workflow_analytics');
```

### 3. Configure Database Access Controls

For production deployments, ensure proper database permissions:

```sql
-- Create application user with limited privileges
CREATE USER app_user WITH PASSWORD 'secure_password';
GRANT CONNECT ON DATABASE auto_bidder_prod TO app_user;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
```

### 4. Set Up Draft Cleanup Job

**Option A: PostgreSQL pg_cron Extension**
```sql
-- Enable extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily cleanup at 2 AM UTC
SELECT cron.schedule(
  'cleanup-expired-drafts',
  '0 2 * * *',
  $$DELETE FROM draft_work WHERE updated_at < NOW() - INTERVAL '24 hours'$$
);

-- Verify job created
SELECT * FROM cron.job;
```

**Option B: GitHub Actions** (Recommended for Vercel/Railway deployments)

Create `.github/workflows/cleanup-drafts.yml`:
```yaml
name: Cleanup Expired Drafts
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  cleanup:
    runs-on: ubuntu-latest
    steps:
      - name: Call cleanup endpoint
        run: |
          curl -X POST "${{ secrets.API_URL }}/api/drafts/cleanup?retention_hours=24" \
            -H "Authorization: Bearer ${{ secrets.SERVICE_KEY }}"
```

**Option C: Vercel Cron Jobs**

Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/cleanup-drafts",
    "schedule": "0 2 * * *"
  }]
}
```

---

## 🔧 Backend Configuration

### Environment Variables (Production)

Create `backend/.env.production`:

```bash
# Core Settings
ENVIRONMENT=production
LOG_LEVEL=INFO

# Database (Update with your production database URL)
DATABASE_URL=postgresql+asyncpg://user:pass@host:5432/dbname

# Authentication
JWT_SECRET=your-super-secret-jwt-key-change-this
JWT_ALGORITHM=HS256
JWT_EXPIRATION_DAYS=7

# Workflow Optimization
SESSION_STATE_TTL_HOURS=24
DRAFT_RETENTION_HOURS=24
MAX_DRAFT_SIZE_KB=1000
ENABLE_WORKFLOW_ANALYTICS=true

# Security
CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
JWT_SECRET=your-secure-secret-key

# Monitoring (Optional)
SENTRY_DSN=your-sentry-dsn
```

### Deployment Platforms

#### **Vercel (Recommended for Next.js)**

**Backend Setup** (if deploying backend separately):
1. Deploy to Railway, Render, or Fly.io
2. Set environment variables in platform dashboard
3. Update CORS to include your frontend domain

#### **Railway**

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Link project
railway link

# Set environment variables
railway variables set ENVIRONMENT=production
railway variables set SESSION_STATE_TTL_HOURS=24
# ... set all other variables

# Deploy
railway up
```

#### **Docker**

```bash
# Build backend image
cd backend
docker build -t auto-bidder-backend:latest .

# Run with environment variables
docker run -d \
  --name auto-bidder-backend \
  --env-file .env.production \
  -p 8000:8000 \
  auto-bidder-backend:latest
```

---

## 🎨 Frontend Configuration

### Environment Variables (Production)

Create `frontend/.env.production`:

```bash
# Backend API
NEXT_PUBLIC_BACKEND_API_URL=https://api.yourdomain.com

# Frontend Settings
NEXT_PUBLIC_AUTO_SAVE_INTERVAL_MS=10000
NEXT_PUBLIC_OFFLINE_SYNC_RETRY_MS=5000
NEXT_PUBLIC_ENABLE_KEYBOARD_SHORTCUTS=true
NEXT_PUBLIC_VIRTUAL_SCROLL_THRESHOLD=100

# Analytics (Optional)
NEXT_PUBLIC_GA_MEASUREMENT_ID=G-XXXXXXXXXX
```

### Vercel Deployment

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd frontend
vercel --prod

# Set environment variables in Vercel dashboard:
# https://vercel.com/your-project/settings/environment-variables
```

### Build Optimization

Update `next.config.js`:
```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable React strict mode for better error catching
  reactStrictMode: true,
  
  // Optimize bundle size
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  
  // Configure headers for security
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
        ],
      },
    ]
  },
}

module.exports = nextConfig
```

---

## 📊 Monitoring & Alerts

### 1. Performance Monitoring

**Key Metrics to Track:**
- Navigation timing (target: <500ms)
- Auto-save success rate (target: >99%)
- Draft recovery usage
- Conflict occurrence rate
- API response times

**Setup with Vercel Analytics:**
```bash
npm install @vercel/analytics
```

Add to `frontend/src/app/layout.tsx`:
```typescript
import { Analytics } from '@vercel/analytics/react'

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

### 2. Error Tracking

**Setup Sentry (Recommended):**

Backend (`backend/app/main.py`):
```python
import sentry_sdk

if settings.environment == "production":
    sentry_sdk.init(
        dsn=settings.sentry_dsn,
        traces_sample_rate=0.1,
        environment="production",
    )
```

Frontend (`frontend/src/app/layout.tsx`):
```typescript
import * as Sentry from "@sentry/nextjs"

if (process.env.NODE_ENV === 'production') {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    tracesSampleRate: 0.1,
  })
}
```

### 3. Alert Configuration

**Recommended Alerts:**
- API error rate > 5%
- Average navigation time > 700ms
- Auto-save failure rate > 1%
- Database connection failures
- Disk space > 80%

---

## 🧪 Pre-Production Testing

### Staging Environment

1. **Deploy to Staging**
   - Use staging database
   - Test with production-like data volume
   - Verify all migrations applied

2. **Run Test Suite**
   ```bash
   # Backend tests
   cd backend
   pytest tests/

   # Frontend tests
   cd frontend
   npm run test
   ```

3. **Load Testing**
   ```bash
   # Install k6
   brew install k6

   # Run load test
   k6 run tests/load/navigation-test.js
   ```

4. **Acceptance Testing**
   - Complete all test scenarios from QUICK_START.md
   - Test on multiple browsers (Chrome, Firefox, Safari)
   - Test on mobile devices
   - Verify offline functionality

---

## 🚀 Deployment Steps

### Day of Deployment

**1. Pre-Deployment** (1 hour before)
```bash
# Backup production database
pg_dump $PROD_DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# Verify backup
ls -lh backup_*.sql
```

**2. Deploy Backend** (15 minutes)
```bash
# Apply migrations
psql $PROD_DATABASE_URL < database/migrations/004_workflow_optimization.sql

# Deploy backend
railway up
# OR
docker push your-registry/auto-bidder-backend:latest
kubectl rollout restart deployment/auto-bidder-backend

# Verify deployment
curl https://api.yourdomain.com/health
```

**3. Deploy Frontend** (10 minutes)
```bash
# Deploy to Vercel
cd frontend
vercel --prod

# Verify deployment
curl https://yourdomain.com
```

**4. Post-Deployment Verification** (15 minutes)
- [ ] Check health endpoint
- [ ] Test navigation (should be <500ms)
- [ ] Test auto-save
- [ ] Test draft recovery
- [ ] Check error tracking dashboard
- [ ] Monitor logs for errors

**5. Monitor** (1 hour)
- Watch error rates
- Check performance metrics
- Review user feedback
- Monitor database queries

---

## 🔄 Rollback Plan

If critical issues are detected:

### Quick Rollback

**Frontend:**
```bash
# Vercel
vercel rollback

# Manual
git revert <commit-hash>
vercel --prod
```

**Backend:**
```bash
# Railway
railway rollback

# Docker/Kubernetes
kubectl rollout undo deployment/auto-bidder-backend

# Manual
git revert <commit-hash>
railway up
```

### Database Rollback

⚠️ **WARNING**: Database rollbacks are risky!

If absolutely necessary:
```sql
-- Drop new tables (will lose all workflow data!)
DROP TABLE IF EXISTS workflow_analytics;
DROP TABLE IF EXISTS draft_work;
DROP TABLE IF EXISTS user_session_states;

-- Restore from backup
psql $PROD_DATABASE_URL < backup_YYYYMMDD_HHMMSS.sql
```

---

## 📈 Post-Deployment Tasks

### Week 1
- [ ] Monitor error rates daily
- [ ] Review performance metrics
- [ ] Check draft cleanup job running
- [ ] Analyze user feedback
- [ ] Fix any high-priority issues

### Month 1
- [ ] Review analytics data
- [ ] Optimize slow queries
- [ ] Tune auto-save intervals if needed
- [ ] Plan next feature iterations

---

## 🎯 Success Metrics

Track these KPIs:

| Metric | Target | Current |
|--------|--------|---------|
| Navigation Time (P95) | <500ms | _Monitor_ |
| Auto-Save Success Rate | >99% | _Monitor_ |
| Draft Recovery Usage | >5% of users | _Monitor_ |
| Conflict Rate | <1% of saves | _Monitor_ |
| Error Rate | <0.5% | _Monitor_ |
| User Satisfaction | >4.5/5 | _Survey_ |

---

## 📞 Support

### Incident Response

**Critical Issues** (Site down, data loss):
1. Check status page
2. Review error logs
3. Contact on-call engineer
4. Execute rollback if needed

**Non-Critical Issues**:
1. Create ticket in issue tracker
2. Assess priority
3. Schedule fix in next sprint

### Monitoring Dashboards

- **Performance**: Vercel Analytics
- **Errors**: Sentry Dashboard
- **Database**: PostgreSQL metrics (pg_stat_statements, logs)
- **API**: FastAPI /docs endpoint

---

## ✅ Deployment Complete!

Congratulations! Your workflow optimization feature is live! 🎉

**Next Steps**:
1. Monitor metrics closely for first 24 hours
2. Gather user feedback
3. Plan next iterations based on data
4. Continue with remaining 64 tasks as needed

**Documentation Links**:
- Technical Details: `IMPLEMENTATION_SUMMARY.md`
- Quick Start: `QUICK_START.md`
- Task Status: `specs/001-smooth-workflow/tasks.md`
- Clarifications: See proposal-workflow-ui.md
