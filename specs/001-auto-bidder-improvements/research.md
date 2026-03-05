# Research: Auto-Bidder Improvements

**Feature**: 001-auto-bidder-improvements
**Phase**: 0 - Outline & Research
**Date**: 2025-03-04

## 1. RAG Collection Alignment

### Decision
Align AIService RAG search with document ingestion collections. Use collections: `case_studies`, `team_profiles`, `portfolio` (map `other` → `general_kb` for search compatibility).

### Rationale
- AIService currently searches `case_studies`, `team_profiles`, `general_kb`
- Document upload allows `case_studies`, `team_profiles`, `portfolio`, `other`
- Mismatch: `portfolio` and `other` are not searched; `general_kb` is not populated by uploads
- Documents stored in `portfolio` or `other` are invisible to RAG

### Alternatives Considered
- **A**: Add `portfolio` and `other` to AIService search list → Chosen
- **B**: Rename collections in document service to match AIService → Breaking change for existing data
- **C**: Map `portfolio` → `general_kb` in document service → Confusing semantics

### Implementation
- Add `portfolio` to ai_service `collections` list
- Treat `other` documents as `general_kb` when storing in ChromaDB (or add `other` to search)
- Ensure document_service stores to ChromaDB with collection names that AIService queries

---

## 2. Citation Detection for FR-001 / SC-002

### Decision
Use a post-generation validation step: after LLM produces the proposal, scan for overlap between proposal text and RAG chunks. If RAG context was provided and no overlap detected, optionally append a hint or retry with a stronger "cite your sources" prompt.

### Rationale
- SC-002: "At least 80% of generated proposals include at least one relevant citation"
- Need a measurable, testable definition of "citation"
- Simple approach: substring/semantic overlap between proposal and retrieved chunks

### Alternatives Considered
- **A**: Structured output (JSON) from LLM with explicit citation fields → More reliable but requires prompt engineering
- **B**: Post-hoc overlap detection → Simpler, works with existing free-text output
- **C**: Two-phase generation: first extract evidence, then write proposal → More agentic but higher latency

### Implementation
- Add optional `citation_check` in ai_service: compare proposal to `relevant_chunks`
- If chunks provided and zero overlap: log warning, optionally add "Based on my portfolio..." hint
- Future: Structured output with `citations: [{ chunk_id, snippet }]`

---

## 3. Draft Recovery and Conflict Resolution (FR-005, FR-006)

### Decision
Leverage existing DraftManager and `draft_work` table. Ensure frontend calls `updateSessionState` / `recordWorkflowEvent` after fixing URL construction. Add conflict UI when `version` mismatch on save.

### Rationale
- PROGRESS.md: Session/analytics API calls were disabled due to malformed URLs
- Fix root cause in `api/client.ts` URL construction
- DraftManager already supports versioning; conflict resolution exists in workflow

### Alternatives Considered
- **A**: Re-enable API calls after URL fix → Chosen
- **B**: Build new recovery mechanism → Duplicates existing logic
- **C**: Client-only recovery (localStorage) → Doesn't persist across devices

### Implementation
- Fix `NEXT_PUBLIC_BACKEND_API_URL` usage; ensure no double-prefixing
- Re-enable `updateSessionState` and `recordWorkflowEvent` in session-context
- Verify conflict dialog in proposal editor works with draft API

---

## 4. Job Discovery Keyword Matching (FR-007, SC-005)

### Decision
Enhance HuggingFace `hf_job_source` with keyword filtering. Already implemented: `keyword_filter` in `fetch_hf_jobs`. Ensure projects API passes user keywords from `keywords` table into discover request.

### Rationale
- HuggingFace integration (HUGGINGFACE_INTEGRATION.md) supports `keyword_filter`
- Keywords table exists; need to wire user keywords to discover endpoint
- No new infrastructure; use existing HF service

### Alternatives Considered
- **A**: Use existing `keyword_filter` in discover → Chosen
- **B**: Add semantic ranking (embeddings) for jobs → Overkill for POC
- **C**: Store jobs in PostgreSQL and filter server-side → Adds persistence (Phase 2)

### Implementation
- Projects discover: accept `keywords` from user profile/settings; pass to `fetch_hf_jobs`
- Frontend: fetch user keywords, include in discover request
- SC-005: 70% match – measure by sampling; document as heuristic for POC

---

## 5. Document Ingestion Status (FR-008, FR-009)

### Decision
Document processing is synchronous. Add `processing_status` polling from frontend. Expose `GET /api/documents/{id}/status` or include status in list. On failure, return structured error with `error_code` and `suggestion`.

### Rationale
- document_service already sets `processing_status`: pending, processing, ready, failed
- Frontend needs to poll or receive status on list
- FR-009: "User-friendly error messages" – map technical errors to actionable text

### Alternatives Considered
- **A**: Poll document list for status → Chosen for POC
- **B**: WebSocket for real-time status → Overkill for sync processing
- **C**: Background queue (Celery) with webhook → Phase 2 (auto-bidder_production_saas_plan)

### Implementation
- Ensure `processing_status` and `error_message` returned in document list/detail
- Add error code mapping: `"ParseError"` → "File may be corrupted or password-protected. Try re-exporting as PDF."
- Frontend: show spinner when `processing`, success when `ready`, error card when `failed`

---

## 6. Rapid Successive Proposal Requests (FR-010)

### Decision
Add simple in-flight guard: one concurrent generation per user. Queue or return 429 if second request arrives before first completes. Use in-memory lock per user_id; for production, use Redis.

### Rationale
- Prevents double-charge to LLM, race conditions in draft save
- POC: in-memory sufficient
- Production: Redis-based distributed lock

### Alternatives Considered
- **A**: In-memory per-user lock → Chosen for POC
- **B**: Redis lock → Production hardening
- **C**: Client-side debounce only → Insufficient; user can open multiple tabs

### Implementation
- `ai_service.generate_proposal`: acquire lock (asyncio.Lock keyed by user_id), release on completion
- On lock contention: return 429 with Retry-After header

---

## 7. Frontend "AI Generate" Wiring

### Decision
Verify and fix: Proposal new page `handleAIGenerate` must call `POST /api/proposals/generate-from-job` with job context. Replace placeholder implementation.

### Rationale
- PROPOSAL_WORKFLOW_INTEGRATION.md: "AI Generate does nothing - RAG integration pending"
- Backend endpoint exists and works (ai_service)
- Critical for demo flow

### Alternatives Considered
- **A**: Wire to existing backend endpoint → Chosen
- **B**: Server action in Next.js → Requires backend proxy; current architecture uses direct API
- **C**: Client-side mock → No real AI

### Implementation
- In `proposals/new/page.tsx`: `handleAIGenerate` → `api.proposals.generateFromJob(...)`
- Pass `job_title`, `job_description`, `job_skills`, `strategy_id` (optional)
- Pre-fill form with `GeneratedProposal` response

---

## 8. Agentic Architecture (antigravity-1.md)

### Decision
Current AIService is already "agentic" per antigravity-1: orchestration (RAG + strategy + LLM), contextual memory, strategy-driven persona. No LangGraph/PydanticAI migration for this improvement set. Document and reinforce existing flow.

### Rationale
- antigravity-1: "Orchestration Layer that acts as a cognitive agent"
- FR-001 to FR-003 achievable with current design
- LangGraph adds complexity; defer to future "Phase 2 agent" if funding requires

### Alternatives Considered
- **A**: Keep current AIService, improve prompts and RAG → Chosen
- **B**: Introduce LangGraph for multi-step agent → Future roadmap
- **C**: Add PydanticAI tools (rag_search, strategy_fetch) → Incremental; evaluate after POC

---

## Summary of Resolved Items

| Item | Status |
|------|--------|
| RAG collection alignment | Resolved: add portfolio, map other |
| Citation detection | Resolved: post-hoc overlap check |
| Draft recovery | Resolved: fix URL, re-enable APIs |
| Job keyword matching | Resolved: use existing keyword_filter |
| Document status | Resolved: poll, error mapping |
| Rapid requests | Resolved: per-user lock |
| AI Generate wiring | Resolved: call backend API |
| Agentic architecture | Resolved: no change; document existing |
