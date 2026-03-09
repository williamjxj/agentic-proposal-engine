# Knowledge Base Documentation 📚

**Last Updated**: March 8, 2026  
**Status**: ✅ Production Ready

---

## Overview

The Knowledge Base is a core feature that enables users to upload and manage documents (PDFs, DOCX, TXT) that serve as context for AI-powered proposal generation. Documents are stored in three layers:
1. **PostgreSQL** - Metadata (title, filename, status, contact info)
2. **Local Filesystem** - Original file storage (`backend/data/kb/`)
3. **ChromaDB** - Vector embeddings for semantic search (RAG)

---

## Architecture

### Three-Layer Storage System

```
┌─────────────────────────────────────────────────────────────────┐
│                        Upload Document                          │
│                    (PDF, DOCX, TXT + Metadata)                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴───────────┐
                │  FastAPI Backend       │
                │  document_service.py   │
                └────────────┬───────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
┌────────────────┐  ┌─────────────────┐  ┌──────────────────┐
│  PostgreSQL    │  │  Local Storage  │  │    ChromaDB      │
│  Metadata DB   │  │  File System    │  │  Vector Store    │
├────────────────┤  ├─────────────────┤  ├──────────────────┤
│ • id (UUID)    │  │ Path:           │  │ • Embeddings     │
│ • title        │  │ data/kb/        │  │ • Text chunks    │
│ • filename     │  │  {user_id}/     │  │ • Metadata       │
│ • file_type    │  │  {doc_id}.ext   │  │ • Supplemental   │
│ • status       │  │                 │  │   info (search)  │
│ • contact info │  │ • PDF original  │  │                  │
│ • reference    │  │ • DOCX original │  │ Collections:     │
│ • timestamps   │  │ • TXT original  │  │ - case_studies   │
└────────────────┘  └─────────────────┘  │ - team_profiles  │
                                          │ - portfolio      │
                                          │ - general_kb     │
                                          └──────────────────┘
```

### Document Upload Workflow

```mermaid
sequenceDiagram
    participant U as User (Browser)
    participant F as Frontend (Next.js)
    participant A as API (FastAPI)
    participant P as PostgreSQL
    participant FS as File System
    participant C as ChromaDB

    U->>F: Upload (file + metadata)
    F->>F: Validate (type, size)
    F->>F: Auto-populate title
    F->>A: POST /api/documents/upload
    
    A->>A: Generate UUID
    A->>P: INSERT metadata record
    P-->>A: Document created (status: pending)
    
    A->>FS: Save file (data/kb/{user_id}/{doc_id}.ext)
    
    A->>A: Process document
    A->>P: UPDATE status = processing
    A->>A: Parse file (PDF/DOCX/TXT)
    A->>A: Chunk text (1000 chars, 200 overlap)
    A->>A: Append supplemental_info to last chunk
    A->>A: Generate embeddings (sentence-transformers)
    A->>C: Store vectors + chunks
    A->>P: UPDATE (status=completed, chunk_count, token_count)
    
    A-->>F: Document object
    F->>F: Refresh list
    F-->>U: Success notification
```

---

## Features (March 2026 Update)

### 1. Document Title ✅
- **Required** field
- Max 200 characters
- Auto-populates from filename (extension removed)
- User can edit before upload
- Stored in PostgreSQL
- Indexed for fast search

### 2. Supplemental Information ✅
- **Optional** textarea (4 rows)
- Platform-specific context (e.g., "Upwork preferred", "Freelancer specialization")
- **NOT stored in database**
- **Appended to last chunk** before embedding
- Searchable via ChromaDB semantic search
- Helps AI retrieve platform-specific context

**Use Case**: 
```
Document: "Portfolio - Web Development.pdf"
Supplemental Info: "Specialized in React + Node.js. Upwork Top Rated. 
Freelancer Expert Certified. Focus: SaaS dashboards."

Result: When RAG searches for "React SaaS experience", 
it retrieves this document WITH the supplemental context.
```

### 3. Contact & Reference Fields ✅
- **Optional** fields in collapsible accordion (default: closed)
- Fields:
  - **Reference URL**: Company website, GitHub, portfolio
  - **Email**: Contact email
  - **Phone**: Contact phone
  - **Contact URL**: LinkedIn, personal website
- Stored in PostgreSQL
- Displayed in document list with icons (🔗📧📞👤)

### 4. Accordion UI ✅
- Collapses optional fields by default
- Clean, uncluttered upload form
- Toggle button: ▶ (closed) / ▼ (open)
- Reduces cognitive load for quick uploads

---

## Database Schema

### Table: `knowledge_base_documents`

```sql
CREATE TABLE knowledge_base_documents (
  -- Core Identity
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- File Information
  title VARCHAR(200),                    -- NEW: Document title
  filename VARCHAR(500) NOT NULL,
  file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt')),
  file_size_bytes BIGINT NOT NULL,
  file_url TEXT,                         -- Relative path: data/kb/{user_id}/{doc_id}.ext
  
  -- Collection
  collection VARCHAR(50) NOT NULL CHECK (collection IN ('case_studies', 'team_profiles', 'portfolio', 'other')),
  
  -- Contact & Reference (NEW)
  reference_url TEXT,                    -- Company website, GitHub, etc.
  email VARCHAR(255),                    -- Contact email
  phone VARCHAR(50),                     -- Contact phone
  contact_url TEXT,                      -- LinkedIn, personal site
  
  -- Processing Status
  processing_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  
  -- Embedding Metadata
  chunk_count INT DEFAULT 0,
  token_count INT DEFAULT 0,
  embedding_model VARCHAR(50),
  chroma_collection_name VARCHAR(100),
  
  -- Usage Stats
  retrieval_count INT DEFAULT 0,
  last_retrieved_at TIMESTAMP,
  
  -- Timestamps
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_kb_docs_user_id ON knowledge_base_documents(user_id);
CREATE INDEX idx_kb_docs_collection ON knowledge_base_documents(collection);
CREATE INDEX idx_kb_docs_status ON knowledge_base_documents(processing_status);
CREATE INDEX idx_kb_docs_title ON knowledge_base_documents(title);        -- NEW
CREATE INDEX idx_kb_docs_email ON knowledge_base_documents(email);        -- NEW
CREATE INDEX idx_kb_docs_phone ON knowledge_base_documents(phone);        -- NEW
```

**Note**: `supplemental_info` is **NOT** stored in database - it's embedded with document chunks in ChromaDB.

---

## API Endpoints

### 1. Upload Document

**Endpoint**: `POST /api/documents/upload`  
**Auth**: Required (JWT)  
**Content-Type**: `multipart/form-data`

**Request**:
```http
POST /api/documents/upload?collection=case_studies&title=AWS%20Case%20Study&supplemental_info=Upwork%20project HTTP/1.1
Authorization: Bearer <token>
Content-Type: multipart/form-data

------WebKitFormBoundary
Content-Disposition: form-data; name="file"; filename="case_study.pdf"
Content-Type: application/pdf

<binary data>
------WebKitFormBoundary--
```

**Query Parameters**:
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `collection` | string | ✅ | `case_studies`, `team_profiles`, `portfolio`, `other` |
| `title` | string | ❌ | Document title (max 200 chars, defaults to filename) |
| `supplemental_info` | string | ❌ | Additional context to embed with document |
| `reference_url` | string | ❌ | Reference URL |
| `email` | string | ❌ | Contact email |
| `phone` | string | ❌ | Contact phone |
| `contact_url` | string | ❌ | Contact URL (LinkedIn, etc.) |

**Response** (201 Created):
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "user_id": "123e4567-e89b-12d3-a456-426614174000",
  "title": "AWS Case Study",
  "filename": "case_study.pdf",
  "file_type": "pdf",
  "file_size_bytes": 524288,
  "file_url": "data/kb/123e4567.../550e8400....pdf",
  "collection": "case_studies",
  "processing_status": "completed",
  "chunk_count": 15,
  "token_count": 3840,
  "reference_url": "https://company.com",
  "email": "contact@example.com",
  "phone": "+1-555-123-4567",
  "contact_url": "https://linkedin.com/in/user",
  "uploaded_at": "2026-03-08T10:30:00Z",
  "processed_at": "2026-03-08T10:30:05Z"
}
```

### 2. List Documents

**Endpoint**: `GET /api/documents`  
**Auth**: Required

**Query Parameters**:
- `collection` (optional): Filter by collection
- `status` (optional): Filter by processing status

**Response**:
```json
[
  {
    "id": "...",
    "title": "AWS Case Study",
    "filename": "case_study.pdf",
    "collection": "case_studies",
    "processing_status": "completed",
    "chunk_count": 15,
    "uploaded_at": "2026-03-08T10:30:00Z"
  }
]
```

### 3. Get Document

**Endpoint**: `GET /api/documents/{document_id}`  
**Auth**: Required

### 4. Delete Document

**Endpoint**: `DELETE /api/documents/{document_id}`  
**Auth**: Required

**Behavior**:
- Deletes PostgreSQL record
- Deletes file from `data/kb/`
- Deletes vectors from ChromaDB

### 5. Reprocess Document

**Endpoint**: `POST /api/documents/{document_id}/reprocess`  
**Auth**: Required

**Use Case**: Re-chunk and re-embed after ChromaDB settings change

---

## Frontend Components

### 1. DocumentUpload Component

**Location**: `frontend/src/components/knowledge-base/document-upload.tsx`

**Features**:
- File picker (PDF, DOCX, TXT)
- File validation (type, size < 50MB)
- Title field (required, auto-populated)
- Collection selector
- Accordion for optional fields
- Supplemental info textarea
- Contact/reference inputs
- Upload progress indicator
- Error handling

**State Management**:
```typescript
const [selectedFile, setSelectedFile] = useState<File | null>(null)
const [title, setTitle] = useState<string>('')
const [collection, setCollection] = useState<DocumentCollection>('case_studies')
const [supplementalInfo, setSupplementalInfo] = useState<string>('')
const [referenceUrl, setReferenceUrl] = useState<string>('')
const [email, setEmail] = useState<string>('')
const [phone, setPhone] = useState<string>('')
const [contactUrl, setContactUrl] = useState<string>('')
const [isOptionalOpen, setIsOptionalOpen] = useState(false) // Default: closed
```

### 2. DocumentList Component

**Location**: `frontend/src/components/knowledge-base/document-list.tsx`

**Features**:
- Displays documents in table/card view
- Status badges (pending, processing, completed, failed)
- File type icons (📄 PDF, 📝 DOCX, 📃 TXT)
- Contact info icons (🔗📧📞👤)
- Delete button
- Reprocess button
- Download link

---

## Backend Services

### DocumentService

**Location**: `backend/app/services/document_service.py`

**Key Methods**:

#### `upload_document()`
```python
async def upload_document(
    user_id: str,
    file_content: bytes,
    filename: str,
    collection: str,
    title: Optional[str] = None,
    supplemental_info: Optional[str] = None,
    reference_url: Optional[str] = None,
    email: Optional[str] = None,
    phone: Optional[str] = None,
    contact_url: Optional[str] = None
) -> Document:
    """
    Upload and process a document.
    
    Flow:
    1. Validate file (size, type)
    2. Generate UUID
    3. Save to filesystem
    4. Store metadata in PostgreSQL
    5. Process document (chunk, embed, store in ChromaDB)
    """
```

#### `_process_document()`
```python
async def _process_document(
    document_id: str,
    user_id: str,
    file_content: bytes,
    file_type: str,
    collection: str,
    supplemental_info: Optional[str] = None
) -> None:
    """
    Parse, chunk, embed, and store document.
    
    Steps:
    1. Update status to 'processing'
    2. Load document with LangChain (PyPDFLoader, Docx2txtLoader, TextLoader)
    3. Split into chunks (RecursiveCharacterTextSplitter)
    4. Append supplemental_info to LAST chunk (if provided)
    5. Generate embeddings (sentence-transformers/all-MiniLM-L6-v2)
    6. Store in ChromaDB
    7. Update metadata (status=completed, chunk_count, token_count)
    """
```

**Supplemental Info Implementation**:
```python
# After chunking
chunk_texts = [chunk.page_content for chunk in chunks]

# Append supplemental info to last chunk for embedding
if supplemental_info:
    supplemental_section = f"\n\n---SUPPLEMENTAL INFO---\n{supplemental_info}"
    chunk_texts[-1] += supplemental_section

# Generate embeddings (supplemental info is now searchable!)
embeddings = self.embedding_model.encode(chunk_texts, ...)
```

---

## Text Processing

### Chunking Strategy

**Tool**: `RecursiveCharacterTextSplitter` (LangChain)

**Settings**:
```python
chunk_size = 1000       # Max characters per chunk
chunk_overlap = 200     # Overlap between chunks
separators = ["\n\n", "\n", ". ", " ", ""]  # Try these in order
```

**Why Overlap?**  
Prevents semantic context loss at chunk boundaries. Example:
```
Chunk 1: "...our team delivered the project. The client reported 40%"
Chunk 2: "client reported 40% cost savings and 3x faster deployment."
```

### Embedding Model

**Model**: `sentence-transformers/all-MiniLM-L6-v2`

**Specs**:
- Dimensions: 384
- Speed: ~3,000 sentences/sec (CPU)
- Quality: Good for semantic search
- Size: ~80MB
- Local inference: No API calls

**Alternative Models** (future):
- `all-mpnet-base-v2` (higher quality, slower)
- `multilingual-e5-base` (multilingual support)

---

## ChromaDB Integration

### Collections

Documents are stored in user-scoped collections:

| Collection Name | Usage |
|----------------|-------|
| `case_studies_{user_id}` | Case studies, success stories |
| `team_profiles_{user_id}` | Team bios, CVs, resumes |
| `portfolio_{user_id}` | Project portfolios, demos |
| `general_kb_{user_id}` | Other documents (mapped from "other") |

### Metadata Stored with Each Chunk

```python
{
  "document_id": "550e8400-...",
  "user_id": "123e4567-...",
  "filename": "case_study.pdf",
  "collection": "case_studies",
  "chunk_index": 5,
  "total_chunks": 15
}
```

### RAG Query Flow

```python
# 1. User asks: "Show me React experience"
# 2. Embed query with same model
query_embedding = embedding_model.encode("Show me React experience")

# 3. Search ChromaDB
results = chroma_client.query(
    collection_name=f"portfolio_{user_id}",
    query_embeddings=[query_embedding],
    n_results=5
)

# 4. Results include supplemental info if relevant
# Example result:
# "...built React dashboard with TypeScript...
#  ---SUPPLEMENTAL INFO---
#  Specialized in React + Node.js. Upwork Top Rated."
```

---

## File Storage

### Directory Structure

```
backend/data/kb/
├── {user_id_1}/
│   ├── {doc_id_1}.pdf
│   ├── {doc_id_2}.docx
│   └── {doc_id_3}.txt
├── {user_id_2}/
│   └── {doc_id_4}.pdf
└── README.md
```

### Storage Configuration

**Location**: `backend/app/config.py`

```python
class Settings(BaseSettings):
    kb_storage_dir: str = Field(
        default="./data/kb",
        description="Knowledge base file storage directory"
    )
    max_file_size_bytes: int = Field(
        default=50 * 1024 * 1024,  # 50MB
        description="Maximum file upload size"
    )
```

### File Path Format

**Pattern**: `data/kb/{user_id}/{document_id}.{ext}`

**Example**: `data/kb/123e4567-e89b-12d3-a456-426614174000/550e8400-e29b-41d4-a716-446655440000.pdf`

**Benefits**:
- User isolation (one user can't access another's files)
- UUID prevents filename collisions
- Relative path stored in DB (portable)
- Extension preserved for MIME type detection

---

## Usage Examples

### Example 1: Upload Case Study with All Fields

```typescript
const formData = new FormData()
formData.append('file', pdfFile)

const response = await uploadDocument(pdfFile, 'case_studies', {
  title: 'AWS Migration Case Study',
  supplemental_info: 'Upwork Top Rated project. Client: Fortune 500. Tech: AWS, Terraform, Docker.',
  reference_url: 'https://company.com/case-studies/aws',
  email: 'pm@company.com',
  phone: '+1-555-123-4567',
  contact_url: 'https://linkedin.com/in/project-manager'
})
```

### Example 2: Quick Upload (Title Only)

```typescript
await uploadDocument(file, 'portfolio', {
  title: 'E-commerce Platform Demo'
  // All other fields optional
})
```

### Example 3: RAG Query with Supplemental Context

```python
# User uploads resume with supplemental info:
# "Freelancer Expert. 5 years React. Prefer remote SaaS projects."

# Later, RAG query:
results = await vector_store.search(
    user_id=user_id,
    query="React developer for remote SaaS project",
    collections=["team_profiles"],
    n_results=3
)

# Result includes the supplemental info:
# "...5 years React experience at Google...
#  ---SUPPLEMENTAL INFO---
#  Freelancer Expert. 5 years React. Prefer remote SaaS projects."
#
# RAG score: 0.92 (high relevance due to supplemental context!)
```

---

## Database Migration

**File**: `database/migrations/004_add_kb_document_fields.sql`

**Apply**:
```bash
psql -U postgres -d auto_bidder_dev -f database/migrations/004_add_kb_document_fields.sql
```

**Contents**:
- Adds `title`, `reference_url`, `email`, `phone`, `contact_url` columns
- Creates indexes on searchable fields
- Adds column comments

---

## Configuration

### Environment Variables

```bash
# PostgreSQL
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/auto_bidder_dev

# ChromaDB (Local Mode - Default)
CHROMA_PERSIST_DIR=./chroma_db
# CHROMA_HOST=                # Leave unset for local mode
# CHROMA_PORT=8001

# ChromaDB (Docker Mode - Production)
# CHROMA_HOST=localhost       # Or 'chromadb' in Docker Compose
# CHROMA_PORT=8001

# File Storage
KB_STORAGE_DIR=./data/kb
MAX_FILE_SIZE_BYTES=52428800  # 50MB

# Embeddings
EMBED_MODEL=sentence-transformers/all-MiniLM-L6-v2
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
```

---

## Testing

### Manual Test

```bash
# Terminal 1: Start backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2: Upload test document
curl -X POST http://localhost:8000/api/documents/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf" \
  -F "collection=case_studies" \
  -F "title=Test Case Study" \
  -F "supplemental_info=Test context for RAG"

# Terminal 3: Query documents
curl http://localhost:8000/api/documents \
  -H "Authorization: Bearer $TOKEN"
```

### Unit Tests

**Location**: `backend/tests/test_document_service.py`

```python
async def test_upload_with_supplemental_info():
    """Test that supplemental info is embedded in chunks."""
    doc = await document_service.upload_document(
        user_id=user_id,
        file_content=pdf_bytes,
        filename="test.pdf",
        collection="case_studies",
        supplemental_info="Upwork project. React expert."
    )
    
    # Verify supplemental info is in ChromaDB (not DB)
    results = await vector_store.search(
        user_id=user_id,
        query="Upwork React",
        collections=["case_studies"]
    )
    assert "Upwork" in results[0].text
```

---

## Performance

### Metrics

| Operation | Avg Time | Notes |
|-----------|----------|-------|
| File upload (10MB PDF) | 2-3s | Includes parsing + embedding |
| Text extraction | 500ms | PyPDFLoader |
| Chunking | 50ms | RecursiveCharacterTextSplitter |
| Embedding (50 chunks) | 1-2s | sentence-transformers on CPU |
| ChromaDB insert | 200ms | Local mode |
| RAG query (top 5) | 100-200ms | Semantic search |

### Optimization Tips

1. **Batch Processing**: Process multiple documents via Celery
2. **GPU Acceleration**: Use `device='cuda'` for faster embeddings
3. **Docker ChromaDB**: Better isolation, slightly slower (network overhead)
4. **Preload Model**: Load embedding model at startup (done)

---

## Troubleshooting

### Issue: "Document processing failed"

**Cause**: File parsing error (corrupt PDF, unsupported format)

**Fix**:
1. Check `processing_error` field in database
2. Verify file is valid PDF/DOCX/TXT
3. Try re-uploading

### Issue: "Supplemental info not appearing in RAG results"

**Cause**: Embedding didn't include supplemental info

**Fix**:
1. Check `_process_document()` appends to last chunk
2. Reprocess document: `POST /api/documents/{id}/reprocess`
3. Verify ChromaDB has updated vectors

### Issue: "File not found" when downloading

**Cause**: File path mismatch or deleted

**Fix**:
1. Check `file_url` in database
2. Verify file exists at `backend/data/kb/{user_id}/{doc_id}.ext`
3. Re-upload document

---

## Future Enhancements

### Planned Features

1. **OCR Support**: Extract text from scanned PDFs (tesseract)
2. **Document Versioning**: Track changes, rollback
3. **Bulk Upload**: Upload zip file with multiple documents
4. **Auto-Tagging**: AI-generated tags from content
5. **Advanced Search**: Filter by date, size, tags
6. **Duplicate Detection**: Warn before uploading similar documents
7. **Export**: Download all documents as zip
8. **Sharing**: Share documents with team members

### Technical Improvements

1. **Async Processing**: Celery for background document processing
2. **S3 Storage**: Replace local storage with cloud (AWS S3, Cloudflare R2)
3. **Image Extraction**: Store images from PDFs separately
4. **Metadata Extraction**: Auto-extract author, date, keywords from PDFs
5. **Webhooks**: Notify on processing completion
6. **Audit Log**: Track who uploaded/deleted documents

---

## Related Documentation

- [AI Proposal Generation — Concepts](./ai-proposal-generation-concepts.md) - How collections, keywords, and RAG connect in proposal generation
- [chromadb-setup.md](./chromadb-setup.md) - ChromaDB hybrid mode setup
- [chromadb-implementation-summary.md](./chromadb-implementation-summary.md) - ChromaDB implementation details
- [chromadb-upgrade-guide.md](./chromadb-upgrade-guide.md) - Upgrading ChromaDB client
- [database-schema-reference.md](./database-schema-reference.md) - Full database schema
- [user-guides.md](./user-guides.md) - End-user documentation

---

## Summary

The Knowledge Base system is a **production-ready, three-layer document management system** that:

✅ Stores metadata in **PostgreSQL**  
✅ Stores files on **local filesystem** (scalable to S3)  
✅ Stores embeddings in **ChromaDB** for semantic search  
✅ Supports **title + supplemental info** for better RAG context  
✅ Provides **contact/reference fields** for document metadata  
✅ Features a **clean accordion UI** for optional fields  
✅ Processes documents **asynchronously** (chunking + embedding)  
✅ Enables **RAG-powered proposal generation** with rich context  

**Key Innovation**: Supplemental info is embedded WITH document chunks, not stored separately. This enables platform-specific context (Upwork, Freelancer) to be retrieved during RAG queries, improving proposal quality.
