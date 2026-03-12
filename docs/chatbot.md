# Chatbot System Documentation 🤖

**Last Updated**: March 11, 2026  
**Status**: 🚧 Basic Implementation (Enhancement Recommended)

---

## Overview

The AI Assistant chatbot provides natural language interaction for project discovery, skills analysis, and matching. Currently implemented as a floating chat widget in the frontend with a basic backend endpoint.

**Current Files:**
- Frontend: [`frontend/src/components/shared/ai-assistant.tsx`](../frontend/src/components/shared/ai-assistant.tsx)
- Backend Endpoint: [`backend/app/routers/projects.py#L338`](../backend/app/routers/projects.py#L338-L380)
- API Client: [`frontend/src/lib/api/client.ts#L926`](../frontend/src/lib/api/client.ts#L926)

---

## Current Implementation

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Chat Widget                         │
│              (ai-assistant.tsx - Floating Button)               │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             │ POST /api/projects/chat?query=...
                             │
                             ▼
                ┌────────────────────────────┐
                │   Backend Endpoint         │
                │   projects.py:chat()       │
                └────────────┬───────────────┘
                             │
          ┌──────────────────┼──────────────────┐
          │                  │                  │
          ▼                  ▼                  ▼
    ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
    │   HF Jobs    │  │  LLM Model   │  │  User Info   │
    │ (10 samples) │  │  (OpenAI/    │  │ (JWT Token)  │
    │              │  │   DeepSeek)  │  │              │
    └──────────────┘  └──────────────┘  └──────────────┘
```

### Current Data Sources

#### ✅ **What's Being Used:**
1. **HuggingFace Datasets** - Fetches 10 sample jobs as context
2. **LLM (OpenAI/DeepSeek)** - Generates responses via `generate_text()` helper
3. **User JWT Token** - Available but not used in prompt

#### ❌ **What's NOT Being Used (But Available):**
1. **ChromaDB Collections** (4 collections available):
   - `case_studies_{user_id}` - User's past project examples
   - `team_profiles_{user_id}` - Team member bios and expertise
   - `portfolio_{user_id}` - Portfolio items, testimonials
   - `general_kb_{user_id}` - General knowledge documents
   
2. **PostgreSQL Database**:
   - `projects` table - Discovered jobs with filters
   - `user_profiles` - User metadata, contact info
   - `keywords` - User's active skills/interests
   - `proposals` - Past proposals and performance

3. **docs/ Folder** - Project documentation (not indexed)

4. **User Profile Service** - Can extract name, email, skills from knowledge base

---

## Current Limitations

### 1. **No User Personalization**
- Response doesn't know user's name, skills, or preferences
- No context about user's portfolio or past work
- Generic responses without tailoring

### 2. **No RAG Integration**
- Doesn't query ChromaDB for relevant context
- Can't reference user's uploaded documents
- Misses valuable information in knowledge base

### 3. **Limited Project Context**
- Only uses 10 sample HF jobs (in HF mode)
- Doesn't query PostgreSQL for filtered/saved projects
- No access to user's project preferences (keywords)

### 4. **Basic Mode Detection**
```python
# Current implementation only works in HF mode
if USE_HF_DATASET:
    jobs, _ = fetch_hf_jobs(dataset_id=HF_DATASET_ID, limit=10)
    # ... generates response
else:
    return {"response": "Chat functionality is still being integrated with the database."}
```

---

## Enhancement Plan

### Phase 1: Add User Context (Quick Win)

**Goal:** Make chat responses personalized with user name and skills

**Implementation:**
```python
@router.post("/chat")
async def chat_with_projects(
    query: str = Query(..., description="The user query"),
    current_user: UserResponse = Depends(get_current_user)
):
    # Extract user info
    user_name = current_user.email.split('@')[0]  # Or from profile
    
    # Get user's active skills/keywords
    user_keywords = await keyword_service.list_keywords(
        str(current_user.id), is_active=True
    )
    skills = [k.keyword for k in user_keywords] if user_keywords else []
    
    # Build personalized prompt
    prompt = f"""
You are an AI assistant helping {user_name} with freelance project discovery.

{user_name}'s skills and interests: {', '.join(skills)}

User asks: "{query}"

Provide a friendly, personalized response.
"""
    
    response = await generate_text(prompt)
    return {"response": response}
```

**Impact:**
- ✅ Responses address user by name
- ✅ Can reference user's declared skills
- ✅ More relevant job recommendations

---

### Phase 2: Integrate RAG (ChromaDB Search)

**Goal:** Retrieve relevant context from user's knowledge base documents

**Implementation:**
```python
from app.services.document_service import document_service
from app.services.vector_store import vector_store

async def chat_with_projects(
    query: str = Query(...),
    current_user: UserResponse = Depends(get_current_user)
):
    # 1. Generate query embedding
    query_embedding = document_service.embedding_model.encode(
        [query], 
        convert_to_numpy=True
    )[0].tolist()
    
    # 2. Search across collections
    rag_context = []
    collections = ["portfolio", "case_studies", "team_profiles", "general_kb"]
    
    for collection in collections:
        try:
            results = await vector_store.similarity_search(
                collection_name=collection,
                user_id=str(current_user.id),
                query_embedding=query_embedding,
                top_k=2  # Top 2 chunks per collection
            )
            rag_context.extend(results)
        except Exception as e:
            logger.debug(f"Collection {collection} search failed: {e}")
    
    # 3. Build context text
    context_text = "\n\n".join([
        f"[{r.get('metadata', {}).get('collection', 'unknown')}] {r.get('document', '')[:300]}"
        for r in rag_context[:5]  # Limit to top 5 results
    ])
    
    # 4. Enhanced prompt with RAG
    prompt = f"""
You are an AI assistant for {user_name}.

Relevant context from {user_name}'s knowledge base:
{context_text}

User asks: "{query}"

Answer using the context above when relevant. Be specific and reference actual content.
"""
    
    response = await generate_text(prompt)
    return {"response": response}
```

**Impact:**
- ✅ Can answer questions about user's portfolio
- ✅ References past projects and experience
- ✅ Provides evidence-based responses

---

### Phase 3: Full Database Integration

**Goal:** Query PostgreSQL for real-time project data and user history

**Features to Add:**

#### A. Project Matching
```python
# Get projects matching user's keywords
from app.services.project_service import list_projects_svc
from app.models.project import ProjectFilters

filtered_projects = await list_projects_svc(
    user_id=str(current_user.id),
    filters=ProjectFilters(
        keyword_filter=True,  # Use user's active keywords
        status=["active"],
        limit=10
    )
)

projects_summary = "\n".join([
    f"- {p.title} ({p.platform}): {p.description[:100]}..."
    for p in filtered_projects[:5]
])
```

#### B. User Profile Enrichment
```python
from app.services.profile_service import profile_service

user_profile = await profile_service.get_profile(str(current_user.id))

profile_context = f"""
Name: {user_profile.name}
Email: {user_profile.email}
Company: {user_profile.company or 'Individual'}
Skills: {', '.join(user_profile.skills or [])}
"""
```

#### C. Proposal History
```python
# Get user's recent successful proposals for style reference
from app.services.proposal_service import proposal_service

recent_proposals = await proposal_service.list_proposals(
    user_id=str(current_user.id),
    status="submitted",
    limit=3
)
```

**Combined Prompt:**
```python
prompt = f"""
You are an AI assistant for {user_name}, a freelancer on the auto-bidder platform.

USER PROFILE:
{profile_context}

KNOWLEDGE BASE CONTEXT:
{rag_context_text}

AVAILABLE PROJECTS (filtered by user's keywords):
{projects_summary}

CONVERSATION HISTORY:
{previous_messages[-3:]}  # Last 3 messages for context

USER QUERY: "{query}"

Provide a helpful, personalized response. Reference specific projects, skills, or documents when relevant.
"""
```

**Impact:**
- ✅ Real-time project recommendations
- ✅ Historical conversation context
- ✅ Proposal success rate insights
- ✅ Complete user context awareness

---

### Phase 4: Advanced Features (Future)

#### 1. **Conversation Memory**
Store chat history in PostgreSQL:
```sql
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY,
    user_id UUID REFERENCES user_profiles(id),
    role VARCHAR(10),  -- 'user' or 'ai'
    content TEXT,
    context_used JSONB,  -- Which documents/projects were referenced
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

#### 2. **Multi-turn Context**
```python
# Load conversation history
chat_history = await get_chat_history(current_user.id, limit=10)

# Include in prompt
conversation_context = "\n".join([
    f"{msg.role.upper()}: {msg.content}"
    for msg in chat_history
])
```

#### 3. **Action Execution**
Enable chat to perform actions:
```python
# Example: "Save this project for later"
if "save" in query.lower() and project_id:
    await set_user_project_status(
        user_id=str(current_user.id),
        project_id=project_id,
        status="interested"
    )
    return {"response": "✓ Project saved to your interested list!", "action": "project_saved"}

# Example: "Generate a proposal for this job"
if "generate proposal" in query.lower() and project_id:
    proposal = await ai_service.generate_proposal(...)
    return {"response": "✓ Proposal generated!", "action": "proposal_created", "data": proposal}
```

#### 4. **Streaming Responses**
Use Server-Sent Events (SSE) for real-time typing effect:
```python
from fastapi.responses import StreamingResponse

@router.post("/chat/stream")
async def chat_with_projects_stream(query: str, current_user: UserResponse = Depends(get_current_user)):
    async def generate_stream():
        # Stream LLM response token by token
        async for chunk in ai_service.chat_model.astream(...):
            yield f"data: {chunk.content}\n\n"
    
    return StreamingResponse(generate_stream(), media_type="text/event-stream")
```

---

## Data Collection Strategy

### Adding Extra Data to Chatbot

#### Option 1: Index docs/ Folder to ChromaDB

**Script to bulk-upload documentation:**
```python
# scripts/index_docs_to_chromadb.py
import asyncio
from pathlib import Path
from app.services.document_service import document_service

async def index_documentation(user_id: str):
    """
    Index all markdown files from docs/ into general_kb collection.
    Useful for providing chatbot with system documentation context.
    """
    docs_path = Path("./docs")
    
    for doc_file in docs_path.rglob("*.md"):
        print(f"Indexing {doc_file}...")
        
        with open(doc_file, 'r') as f:
            content = f.read()
        
        # Upload to general_kb collection
        await document_service.upload_document(
            user_id=user_id,
            title=doc_file.stem.replace('-', ' ').title(),
            collection="general_kb",
            file_content=content.encode('utf-8'),
            filename=doc_file.name,
            contact_info={"source": "system_docs", "path": str(doc_file)}
        )
    
    print(f"✓ Indexed {len(list(docs_path.rglob('*.md')))} documentation files")

# Run with: python -m scripts.index_docs_to_chromadb
if __name__ == "__main__":
    asyncio.run(index_documentation(user_id="system"))
```

#### Option 2: Seed Default Knowledge for All Users

**Create system-wide knowledge base:**
```python
# On user registration, copy default portfolio templates
async def seed_user_knowledge_base(user_id: str):
    default_docs = [
        {
            "title": "Platform Guide",
            "collection": "general_kb",
            "content": Path("docs/user-guides.md").read_text()
        },
        {
            "title": "Proposal Best Practices",
            "collection": "case_studies",
            "content": "Tips for writing winning proposals..."
        }
    ]
    
    for doc in default_docs:
        await document_service.upload_document(
            user_id=user_id,
            title=doc["title"],
            collection=doc["collection"],
            file_content=doc["content"].encode(),
            filename=f"{doc['title']}.md"
        )
```

#### Option 3: Real-time Web Context (External APIs)

**Fetch live data during chat:**
```python
# Example: Get latest market rates for skills
async def get_market_context(skills: List[str]) -> str:
    # Call external API (e.g., Upwork, Freelancer API)
    rates = await fetch_skill_market_rates(skills)
    return f"Current market rates: {rates}"

# Include in prompt
prompt += f"\n\nMARKET CONTEXT:\n{market_context}"
```

---

## Implementation Checklist

### Phase 1 - Basic Personalization (1-2 hours)
- [ ] Extract user name from profile/email
- [ ] Fetch user's active keywords
- [ ] Update prompt template with user context
- [ ] Test with sample queries

### Phase 2 - RAG Integration (3-4 hours)
- [ ] Add embedding generation for user query
- [ ] Implement multi-collection similarity search
- [ ] Format RAG results into prompt context
- [ ] Handle empty/missing collections gracefully
- [ ] Test with knowledge base documents

### Phase 3 - Database Integration (4-6 hours)
- [ ] Query filtered projects from PostgreSQL
- [ ] Fetch user profile with profile_service
- [ ] Add conversation history table/model
- [ ] Store chat messages for context
- [ ] Test with real project data

### Phase 4 - Advanced Features (8-12 hours)
- [ ] Implement multi-turn conversation memory
- [ ] Add action execution framework
- [ ] Build streaming response endpoint
- [ ] Create frontend streaming UI
- [ ] Add conversation export/search

---

## Testing Strategy

### Unit Tests
```python
# tests/unit/test_chat_service.py

async def test_chat_with_user_context():
    """Test that chat includes user name and skills"""
    response = await chat_with_projects(
        query="What projects match my skills?",
        current_user=mock_user
    )
    assert mock_user.email in response["response"]
    assert any(skill in response["response"] for skill in mock_user.skills)

async def test_chat_with_rag():
    """Test that RAG context is retrieved and used"""
    response = await chat_with_projects(
        query="What's in my portfolio?",
        current_user=mock_user
    )
    # Should reference actual portfolio documents
    assert "portfolio" in response.lower()
```

### Integration Tests
```python
# tests/integration/test_chat_flow.py

async def test_full_chat_flow():
    """Test complete chat flow with all data sources"""
    # 1. Upload test document
    await upload_test_portfolio()
    
    # 2. Add test keywords
    await create_test_keywords()
    
    # 3. Chat and verify context is used
    response = await client.post(
        "/api/projects/chat",
        params={"query": "Find me ML projects"},
        headers=auth_headers
    )
    
    assert response.status_code == 200
    assert "machine learning" in response.json()["response"].lower()
```

---

## Performance Considerations

### 1. **RAG Query Optimization**
- Limit top_k to 2-3 per collection (avoid context overflow)
- Cache embeddings for common queries
- Use async/parallel collection searches

### 2. **Database Query Efficiency**
- Index frequently queried columns (user_id, created_at)
- Limit conversation history to last 10 messages
- Use pagination for project lists

### 3. **LLM Token Management**
- Truncate long documents to 300 chars per chunk
- Limit total context to ~2000 tokens
- Monitor OpenAI/DeepSeek API costs

### 4. **Caching Strategy**
```python
# Cache user profile for 5 minutes
from cachetools import TTLCache

user_profile_cache = TTLCache(maxsize=100, ttl=300)

async def get_cached_user_profile(user_id: str):
    if user_id in user_profile_cache:
        return user_profile_cache[user_id]
    
    profile = await profile_service.get_profile(user_id)
    user_profile_cache[user_id] = profile
    return profile
```

---

## Security & Privacy

### 1. **User Data Isolation**
- ✅ ChromaDB collections namespaced by user_id
- ✅ JWT authentication on all endpoints
- ✅ User can only query their own data

### 2. **Conversation Privacy**
- Store chat history per-user (not shared)
- Allow users to delete chat history
- Don't log sensitive information

### 3. **Rate Limiting**
```python
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/chat")
@limiter.limit("10/minute")  # 10 messages per minute
async def chat_with_projects(...):
    ...
```

---

## Monitoring & Analytics

### Metrics to Track

1. **Usage Metrics:**
   - Chat messages per user per day
   - Average response time
   - RAG hit rate (how often context is relevant)

2. **Quality Metrics:**
   - User satisfaction (thumbs up/down)
   - Conversation abandonment rate
   - Action completion rate (if actions implemented)

3. **Cost Metrics:**
   - LLM API calls per day
   - Average tokens per request
   - Total monthly API cost

### Logging Example
```python
logger.info(
    "Chat response generated",
    extra={
        "user_id": user_id,
        "query_length": len(query),
        "rag_chunks_used": len(rag_context),
        "response_length": len(response),
        "latency_ms": int((time.time() - start_time) * 1000)
    }
)
```

---

## Related Documentation

- [Knowledge Base System](./knowledge-base.md) - Document upload and ChromaDB integration
- [AI Proposal Generation](./proposals.md) - How RAG is used for proposals
- [User Profile System](./user-guides.md) - User metadata and preferences
- [ETL Scheduler](./etl-scheduler-guide.md) - Project discovery pipeline

---

## Questions & Future Considerations

### Open Questions
1. Should chat have access to ALL user documents, or only selected collections?
2. How to handle multi-language queries and responses?
3. Should we implement voice input/output?
4. Rate limiting strategy for free vs paid users?

### Future Enhancements
- [ ] Voice input/output (Web Speech API)
- [ ] Multi-language support (i18n)
- [ ] Chat templates/shortcuts (quick replies)
- [ ] Export conversation to PDF/TXT
- [ ] Share chat threads with team members
- [ ] AI-suggested follow-up questions
- [ ] Integration with email system (draft emails via chat)

---

**Next Steps:** Review this plan with the team and prioritize phases based on user needs and available development time.
