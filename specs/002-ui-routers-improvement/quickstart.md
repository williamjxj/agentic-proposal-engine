# Quick Start: UI Routers Improvement

**Feature**: 002-ui-routers-improvement  
**Date**: January 12, 2026

## Overview

This guide helps developers quickly set up and start working on the UI routers improvement feature. It covers environment setup, running the application, and testing the new pages.

## Prerequisites

- Node.js 20+ and npm
- Python 3.12+
- Supabase CLI
- Docker (for local database)
- Git

## Setup Steps

### 1. Database Setup

All required tables already exist from previous migrations. Verify with:

```bash
# Start Supabase locally
supabase start

# Check tables exist
supabase db diff --schema public
```

**Required Tables** (should already exist):
- `keywords` (from `003_biddinghub_merge.sql`)
- `bidding_strategies` (from `001_initial_schema.sql`)
- `knowledge_base_documents` (from `003_biddinghub_merge.sql`)
- `user_profiles` (from `001_initial_schema.sql`)
- `platform_credentials` (from `003_biddinghub_merge.sql`)

### 2. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Set environment variables
cp .env.example .env
# Edit .env with your:
# - OPENAI_API_KEY
# - SUPABASE_URL
# - SUPABASE_SERVICE_KEY
# - CHROMA_PERSIST_DIR

# Start backend server
uvicorn app.main:app --reload --port 8000
```

**New Backend Files to Create**:
- `app/routers/keywords.py`
- `app/routers/strategies.py`
- `app/routers/knowledge_base.py`
- `app/routers/settings.py`
- `app/services/keyword_service.py`
- `app/services/strategy_service.py`
- `app/services/document_service.py`
- `app/services/settings_service.py`

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Set environment variables
cp .env.example .env.local
# Edit .env.local with your:
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - PYTHON_AI_SERVICE_URL (http://localhost:8000)

# Start development server
npm run dev
```

**New Frontend Files to Create**:
- `src/app/(dashboard)/keywords/page.tsx`
- `src/app/(dashboard)/strategies/page.tsx`
- `src/app/(dashboard)/knowledge-base/page.tsx`
- `src/app/(dashboard)/settings/page.tsx`
- `src/components/keywords/` (keyword components)
- `src/components/strategies/` (strategy components)
- `src/components/knowledge-base/` (document components)
- `src/components/settings/` (settings components)
- `src/lib/hooks/useKeywords.ts`
- `src/lib/hooks/useStrategies.ts`
- `src/lib/hooks/useKnowledgeBase.ts`
- `src/lib/hooks/useSettings.ts`

### 4. Supabase Storage Setup

Create storage bucket for knowledge base documents:

```bash
# Via Supabase Dashboard or CLI
supabase storage create knowledge-base --public false
```

Or via SQL:
```sql
-- Create storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('knowledge-base', 'knowledge-base', false);

-- Set RLS policy
CREATE POLICY "Users can upload own documents"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'knowledge-base' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view own documents"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'knowledge-base' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own documents"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'knowledge-base' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Development Workflow

### 1. Start All Services

**Terminal 1**: Backend
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000
```

**Terminal 2**: Frontend
```bash
cd frontend
npm run dev
```

**Terminal 3**: Supabase (if using local)
```bash
supabase start
```

### 2. Test API Endpoints

Use the FastAPI docs at `http://localhost:8000/docs` to test endpoints:

- Keywords: `/api/keywords`
- Strategies: `/api/strategies`
- Knowledge Base: `/api/knowledge-base/documents`
- Settings: `/api/settings`

### 3. Test Frontend Pages

Navigate to:
- Keywords: `http://localhost:3000/keywords`
- Strategies: `http://localhost:3000/strategies`
- Knowledge Base: `http://localhost:3000/knowledge-base`
- Settings: `http://localhost:3000/settings`

## Testing

### Backend Tests

```bash
cd backend
pytest tests/unit/test_keyword_service.py
pytest tests/unit/test_strategy_service.py
pytest tests/unit/test_document_service.py
pytest tests/unit/test_settings_service.py
pytest tests/integration/test_ui_routers_api.py
```

### Frontend Tests

```bash
cd frontend
npm test -- keywords.test.tsx
npm test -- strategies.test.tsx
npm test -- knowledge-base.test.tsx
npm test -- settings.test.tsx
```

### E2E Tests

```bash
cd frontend
npx playwright test keywords.spec.ts
npx playwright test strategies.spec.ts
npx playwright test knowledge-base.spec.ts
npx playwright test settings.spec.ts
```

## Common Issues

### Issue: "Table does not exist"

**Solution**: Run migrations:
```bash
supabase db reset
```

### Issue: "Storage bucket not found"

**Solution**: Create bucket (see Supabase Storage Setup above)

### Issue: "CORS error"

**Solution**: Check `backend/app/main.py` CORS configuration includes `http://localhost:3000`

### Issue: "Authentication failed"

**Solution**: 
1. Verify Supabase credentials in `.env.local`
2. Check JWT token in browser DevTools
3. Verify backend can decode Supabase JWT

### Issue: "File upload fails"

**Solution**:
1. Check file size <50MB
2. Verify file type is PDF, DOCX, or TXT
3. Check Supabase Storage bucket exists and has correct RLS policies
4. Verify backend has access to Supabase Storage API

## Next Steps

1. **Read the Implementation Plan**: See [plan.md](./plan.md) for detailed architecture
2. **Review API Contracts**: See [contracts/](./contracts/) for endpoint specifications
3. **Check Data Model**: See [data-model.md](./data-model.md) for database schema
4. **Review Research**: See [research.md](./research.md) for technology decisions

## Implementation Order

Recommended implementation sequence:

1. **Backend Services** (Week 1)
   - Keyword service + router
   - Strategy service + router
   - Document service + router
   - Settings service + router

2. **Frontend API Client** (Week 1)
   - API functions in `lib/api/client.ts`
   - React Query hooks

3. **UI Pages** (Week 2)
   - Keywords page
   - Strategies page
   - Knowledge Base page
   - Settings page

4. **Integration & Polish** (Week 3)
   - Session state preservation
   - Error handling
   - Loading states
   - Empty states

## Resources

- **Specification**: [spec.md](./spec.md)
- **Implementation Plan**: [plan.md](./plan.md)
- **Research**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **API Contracts**: [contracts/](./contracts/)

---

**Ready to start?** Begin with the backend keyword service and router, then move to the frontend keywords page.
