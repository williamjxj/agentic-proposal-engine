# Research: UI Routers Improvement Technology Decisions

**Feature**: 002-ui-routers-improvement  
**Date**: January 12, 2026  
**Status**: Completed

## Overview

This document captures technology research and architectural decisions for the UI Routers Improvement feature. Each decision includes rationale, alternatives considered, and supporting evidence.

---

## 1. File Upload Strategy

### Decision: Supabase Storage with Direct Backend Processing

**Rationale**:
- Supabase Storage provides built-in file management, CDN, and security
- Integrates seamlessly with existing Supabase authentication
- Backend can access files via Supabase Storage API for processing
- No need for separate file storage infrastructure
- Automatic file URL generation for frontend access
- Built-in RLS policies for file access control

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **Direct Backend Upload** | Full control, no external dependency | Requires file system management, no CDN, scaling issues | More complex, no built-in CDN |
| **S3-Compatible Storage** | Scalable, industry standard | Additional service, more complex setup | Overkill for current scale |
| **Local Filesystem** | Simple, no external service | Not scalable, backup complexity | Not suitable for production |

**Supporting Evidence**:
- Supabase Storage supports files up to 50MB (matches FR-014 requirement)
- Automatic file URL generation: `https://[project].supabase.co/storage/v1/object/public/[bucket]/[path]`
- RLS policies can restrict file access to owner only
- Backend can download files via Supabase Storage API for processing

**Implementation Notes**:
```typescript
// Frontend: Upload to Supabase Storage
const { data, error } = await supabase.storage
  .from('knowledge-base')
  .upload(`${userId}/${filename}`, file, {
    cacheControl: '3600',
    upsert: false
  })

// Backend: Download from Supabase Storage for processing
from supabase import create_client
supabase = create_client(url, key)
file_data = supabase.storage.from('knowledge-base').download(path)
```

**Storage Bucket Configuration**:
- Bucket name: `knowledge-base`
- Public: No (private bucket, access via signed URLs or backend)
- File size limit: 50MB (enforced in frontend and backend)
- Allowed MIME types: `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`, `text/plain`

---

## 2. Document Processing Architecture

### Decision: Asynchronous Processing with Status Polling

**Rationale**:
- Document processing (text extraction, chunking, embedding) can take 10-60 seconds
- Synchronous processing would block API requests and timeout
- Asynchronous processing allows immediate response to user
- Status polling is simpler than WebSocket for MVP
- Can upgrade to WebSocket/SSE later if needed

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **Synchronous Processing** | Simple, immediate feedback | Timeouts, poor UX, blocks requests | Not viable for 10-60s processing |
| **WebSocket/SSE** | Real-time updates, no polling | Complex setup, additional infrastructure | Overkill for MVP, polling sufficient |
| **Background Job Queue (Celery)** | Scalable, robust | Additional infrastructure, complexity | Premature optimization |

**Supporting Evidence**:
- Existing `vector_store.py` service handles document processing
- Processing steps: PDF/DOCX extraction → Text chunking → Embedding generation → ChromaDB storage
- Average processing time: 10-30 seconds for typical documents
- Status polling every 2-3 seconds provides good UX without excessive load

**Implementation Notes**:
```python
# Backend: Start async processing
@router.post("/api/knowledge-base/documents")
async def upload_document(file: UploadFile, collection: str):
    # Save document metadata with status='processing'
    document = await create_document_metadata(file, collection, status='processing')
    
    # Start background task
    asyncio.create_task(process_document(document.id))
    
    return document  # Return immediately with processing status

# Frontend: Poll for status updates
const { data: document } = useQuery({
  queryKey: ['document', documentId],
  queryFn: () => getDocument(documentId),
  refetchInterval: (data) => 
    data?.processing_status === 'processing' ? 2000 : false
})
```

**Processing Status Flow**:
1. `pending` → Uploaded, queued for processing
2. `processing` → Currently being processed
3. `completed` → Successfully processed and indexed
4. `failed` → Processing failed (error message stored)

**Error Handling**:
- Store `processing_error` in database for failed documents
- Allow user to retry processing via `POST /api/knowledge-base/documents/{id}/reprocess`
- Show clear error messages in UI

---

## 3. File Upload UX

### Decision: Both Drag-and-Drop and File Picker

**Rationale**:
- Drag-and-drop provides modern, intuitive UX for power users
- File picker is accessible and familiar to all users
- Supporting both maximizes usability
- shadcn/ui provides components for both patterns
- Accessibility: File picker works with keyboard navigation

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **File Picker Only** | Simple, accessible | Less modern, slower for multiple files | Missing modern UX pattern |
| **Drag-and-Drop Only** | Modern, fast | Not accessible, unfamiliar to some users | Excludes users who prefer file picker |
| **URL Upload** | No file size limits | Complex, requires URL validation | Out of scope for MVP |

**Supporting Evidence**:
- Modern web apps (Google Drive, Dropbox, GitHub) support both
- Drag-and-drop increases user satisfaction and perceived speed
- File picker ensures accessibility compliance (WCAG 2.1)
- Can handle multiple file selection for batch uploads

**Implementation Notes**:
```typescript
// Component: Support both patterns
<div
  onDrop={handleDrop}
  onDragOver={handleDragOver}
  className="border-2 border-dashed rounded-lg p-8"
>
  <input
    type="file"
    ref={fileInputRef}
    onChange={handleFileSelect}
    accept=".pdf,.docx,.txt"
    multiple
    className="hidden"
  />
  <button onClick={() => fileInputRef.current?.click()}>
    Choose Files
  </button>
  <p>or drag and drop files here</p>
</div>
```

**Accessibility**:
- File input has proper `aria-label`
- Drag-and-drop area has `role="button"` and keyboard handler
- Error messages are announced via `aria-live` regions
- Progress indicators are accessible

---

## 4. Strategy Testing/Preview Feature

### Decision: Generate Sample Proposal Using Test Endpoint

**Rationale**:
- Allows users to preview strategy output before using in real proposals
- Uses existing proposal generation endpoint with test flag
- Provides immediate feedback on strategy effectiveness
- No need for separate test infrastructure

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **Static Preview** | Fast, no API call | Not realistic, doesn't test actual generation | Doesn't validate strategy |
| **Separate Test Service** | Isolated testing | Additional complexity, duplicate logic | Unnecessary overhead |
| **Mock Data Preview** | No API cost | Not representative of real output | Doesn't help user validate |

**Supporting Evidence**:
- Existing proposal generation endpoint can accept test mode
- Sample job description can be provided or use default template
- Test proposals are marked and not saved to database
- User can see actual AI output with their strategy

**Implementation Notes**:
```typescript
// Frontend: Test strategy
async function testStrategy(strategyId: string, sampleJob?: string) {
  const jobDescription = sampleJob || DEFAULT_TEST_JOB_DESCRIPTION
  return await apiClient.post(`/api/strategies/${strategyId}/test`, {
    job_description: jobDescription,
    test_mode: true
  })
}

// Backend: Generate test proposal
@router.post("/api/strategies/{strategy_id}/test")
async def test_strategy(strategy_id: str, request: TestStrategyRequest):
    strategy = await get_strategy(strategy_id)
    # Generate proposal using strategy but don't save to database
    proposal = await generate_proposal(
        job_description=request.job_description,
        strategy_id=strategy_id,
        test_mode=True  # Don't save, don't increment use_count
    )
    return {"proposal": proposal, "test_mode": True}
```

**UI Flow**:
1. User clicks "Test Strategy" button
2. Optional: User can provide sample job description
3. System generates proposal using strategy
4. Preview modal shows generated proposal
5. User can edit strategy and test again
6. Test proposals are not saved (marked with test_mode flag)

---

## 5. Platform Credential Verification

### Decision: API Health Check with OAuth Token Validation

**Rationale**:
- Upwork and Freelancer APIs provide token validation endpoints
- Simple health check verifies credentials without full integration
- Can verify OAuth tokens, API keys, and access token expiration
- Provides immediate feedback on credential validity

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **Full API Integration Test** | Comprehensive validation | Complex, requires full API implementation | Premature, out of scope |
| **Manual Verification** | Simple, no API calls | Poor UX, user must verify themselves | Not automated |
| **Token Expiration Check Only** | Fast, simple | Doesn't verify token validity | Insufficient validation |

**Supporting Evidence**:
- Upwork API: `/api/profiles/v1/me` endpoint validates OAuth token
- Freelancer API: `/api/projects/0.1/projects/` endpoint validates API key
- Both APIs return 401 if credentials are invalid
- Token expiration can be checked from `expires_at` timestamp

**Implementation Notes**:
```python
# Backend: Verify platform credentials
@router.post("/api/settings/credentials/{credential_id}/verify")
async def verify_credential(credential_id: str):
    credential = await get_credential(credential_id)
    
    if credential.platform == 'upwork':
        # Verify Upwork OAuth token
        response = requests.get(
            'https://www.upwork.com/api/profiles/v1/me',
            headers={'Authorization': f'Bearer {credential.access_token}'}
        )
        is_valid = response.status_code == 200
    elif credential.platform == 'freelancer':
        # Verify Freelancer API key
        response = requests.get(
            'https://www.freelancer.com/api/projects/0.1/projects/',
            headers={'freelancer-oauth-v1': credential.api_key}
        )
        is_valid = response.status_code == 200
    
    # Update verification status
    await update_credential(credential_id, {
        'last_verified_at': datetime.now(),
        'is_active': is_valid,
        'verification_error': None if is_valid else 'Invalid credentials'
    })
    
    return {'is_valid': is_valid, 'verified_at': datetime.now()}
```

**Error Handling**:
- Network errors: Retry with exponential backoff
- Invalid credentials: Store error message, mark as inactive
- Expired tokens: Check `expires_at`, prompt user to refresh
- Rate limiting: Respect API rate limits, queue verification requests

---

## 6. Form Validation Strategy

### Decision: Zod Schemas Matching Pydantic Models

**Rationale**:
- Type-safe validation on frontend matching backend models
- Single source of truth (backend Pydantic models)
- Zod provides excellent TypeScript integration
- Existing codebase uses Zod (seen in proposal forms)
- Can generate Zod schemas from Pydantic models (future enhancement)

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **Yup** | Mature, feature-rich | Less TypeScript integration, different API | Zod is already in use |
| **Joi** | Powerful validation | No TypeScript support, Node.js focused | Not suitable for frontend |
| **Manual Validation** | Full control | Error-prone, no type safety | Defeats purpose of validation |

**Supporting Evidence**:
- Existing codebase uses Zod for form validation
- React Hook Form integrates seamlessly with Zod
- Pydantic and Zod have similar validation concepts
- Type inference works well with Zod schemas

**Implementation Notes**:
```typescript
// Frontend: Zod schema matching Pydantic model
import { z } from 'zod'

export const keywordSchema = z.object({
  keyword: z.string().min(1).max(255),
  description: z.string().optional(),
  match_type: z.enum(['exact', 'partial', 'fuzzy']).default('partial'),
  is_active: z.boolean().default(true)
})

// Backend: Pydantic model
from pydantic import BaseModel, Field

class KeywordCreate(BaseModel):
    keyword: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = None
    match_type: Literal['exact', 'partial', 'fuzzy'] = 'partial'
    is_active: bool = True
```

**Validation Rules**:
- Keywords: 1-255 characters, unique per user
- Strategies: Name 1-255 characters, system_prompt required, temperature 0-2, max_tokens 100-4000
- Documents: File size <50MB, file type in [PDF, DOCX, TXT], collection required
- Settings: Preferences JSONB validated against schema

---

## 7. Table/List Component Strategy

### Decision: shadcn/ui Table Component with Custom Enhancements

**Rationale**:
- shadcn/ui Table provides accessible, styled table component
- Consistent with existing UI patterns
- Easy to customize for specific needs (sorting, filtering, actions)
- TypeScript-first, well-documented
- Can add virtual scrolling later if needed (react-window)

**Alternatives Considered**:

| Alternative | Pros | Cons | Why Rejected |
|-------------|------|------|--------------|
| **react-table (TanStack Table)** | Feature-rich, powerful | More complex, larger bundle | Overkill for simple CRUD tables |
| **ag-grid** | Enterprise features | Large bundle, licensing | Too heavy for this use case |
| **Custom Table** | Full control | Time-consuming, accessibility concerns | Reinventing the wheel |

**Supporting Evidence**:
- Existing pages (Projects, Proposals) use similar table patterns
- shadcn/ui Table is accessible and follows ARIA patterns
- Can handle 100+ items without performance issues
- Virtual scrolling can be added if datasets grow

**Implementation Notes**:
```typescript
// Use shadcn/ui Table with sorting and filtering
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

<Table>
  <TableHeader>
    <TableRow>
      <TableHead>Keyword</TableHead>
      <TableHead>Match Type</TableHead>
      <TableHead>Status</TableHead>
      <TableHead>Jobs Matched</TableHead>
      <TableHead>Actions</TableHead>
    </TableRow>
  </TableHeader>
  <TableBody>
    {keywords.map(keyword => (
      <TableRow key={keyword.id}>
        <TableCell>{keyword.keyword}</TableCell>
        {/* ... */}
      </TableRow>
    ))}
  </TableBody>
</Table>
```

**Enhancements**:
- Client-side sorting for small datasets (<100 items)
- Server-side filtering via API for larger datasets
- Action buttons (edit, delete, toggle) in last column
- Empty state when no items
- Loading skeleton during data fetch

---

## Summary of Dependencies

### New Frontend Dependencies

```json
{
  // No new dependencies needed - using existing:
  // - @tanstack/react-query (existing)
  // - react-hook-form (existing)
  // - zod (existing)
  // - shadcn/ui components (existing)
}
```

### New Backend Dependencies

```txt
# File processing (if not already present)
pypdf>=3.0.0          # PDF text extraction
python-docx>=1.0.0    # DOCX text extraction
# Already in requirements.txt from existing RAG features
```

### Dev Dependencies

```json
{
  // No new dev dependencies needed - using existing testing setup
}
```

---

## Open Questions & Future Enhancements

### Deferred to Future Iterations

1. **Batch Operations**: Bulk delete, bulk activate/deactivate keywords
   - Rationale: Not in MVP scope, can add if user demand
   - Future value: Power users managing many keywords/strategies

2. **Strategy Templates Marketplace**: Share strategies between users
   - Rationale: Out of scope, complex feature
   - Future value: Community-driven strategy library

3. **Advanced Document Processing**: OCR, image extraction, table extraction
   - Rationale: Basic text extraction sufficient for MVP
   - Future value: Support more document types and formats

4. **Real-time Processing Updates**: WebSocket/SSE for document processing status
   - Rationale: Polling sufficient for MVP
   - Future value: Better UX for long-running processing

5. **Document Versioning**: Track document changes over time
   - Rationale: Not in requirements
   - Future value: Users can see document history

### Requires Further Research (Post-MVP)

1. **Platform API Integration**: Full Upwork/Freelancer API integration
   - Current: Credential storage and verification only
   - Future: Job scraping, proposal submission via APIs

2. **Advanced Search**: Full-text search within document contents
   - Current: Filename search only
   - Future: Search document text, semantic search

3. **Document Collections Management**: Organize documents into folders/categories
   - Current: Collection type only (case_studies, portfolio, etc.)
   - Future: User-defined collections, nested folders

---

**Research Status**: ✅ Complete  
**All NEEDS CLARIFICATION items resolved**  
**Next Step**: Proceed to Phase 1 - Data Model & API Contracts
