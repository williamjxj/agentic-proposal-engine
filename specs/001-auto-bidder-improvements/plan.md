# Implementation Plan: Auto-Bidder Improvements

**Branch**: `001-auto-bidder-improvements` | **Date**: 2025-03-04 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-auto-bidder-improvements/spec.md`

**Reference**: [antigravity-1.md](../../docs/antigravity-1.md) - Agentic AI Proposal Engine POC/MVP for funding application

## Summary

Implement improvements to the Auto-Bidder platform focusing on:
1. **Higher-quality proposals** with RAG citations, strategy alignment, and explicit skill coverage (P1)
2. **Reliable draft persistence** with auto-save, recovery, and conflict resolution (P2)
3. **Better job discovery** via keyword/skill filtering and ranking (P3)
4. **Smoother knowledge base** with clear ingestion status and error feedback (P4)

The implementation builds on the existing **agentic AIService** (RAG + strategy + LLM) documented in antigravity-1.md, reinforcing the orchestration layer for funding-demonstrable outcomes.

## Technical Context

**Language/Version**: Python 3.12 (backend), TypeScript / Node 20 (frontend)
**Primary Dependencies**: FastAPI, LangChain 0.1, ChromaDB, sentence-transformers, PostgreSQL, Next.js 15
**Storage**: PostgreSQL (relational), ChromaDB (vector)
**Testing**: pytest (backend), Vitest/Playwright (frontend)
**Target Platform**: Linux server (backend), Vercel (frontend)
**Project Type**: Web application (monorepo: backend + frontend)
**Performance Goals**: Proposal generation <30s, document ingestion <2 min for 10MB
**Constraints**: RAG must cite portfolio when KB has matching content; draft recovery within 24h
**Scale/Scope**: POC/MVP for funding; single-tenant demo; 10–100 concurrent users

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status |
|-----------|--------|
| Test-first | Tests defined for proposal generation, RAG retrieval, draft recovery |
| Integration testing | API contract tests for proposals, documents, drafts |
| Observability | Structured logging in AIService; metrics for generation latency |
| Simplicity | Incremental changes to existing AIService; no new framework unless justified |
| Security | JWT validation; no credential exposure in proposals |

**No violations** requiring justification. Project follows existing .cursor rules (nextjs, python-llm, python-best-practices).

## Project Structure

### Documentation (this feature)

```text
specs/001-auto-bidder-improvements/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (API specs)
└── tasks.md             # Phase 2 output (/speckit.tasks - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
backend/
├── app/
│   ├── routers/         # proposals, draft, knowledge_base, projects
│   ├── services/       # ai_service, document_service, vector_store
│   ├── models/          # ai.py, proposal.py, document.py
│   └── core/
└── tests/

frontend/
├── src/
│   ├── app/(dashboard)/ # proposals, projects, knowledge-base
│   ├── components/
│   └── lib/             # api client, workflow context
└── __tests__/
```

**Structure Decision**: Existing monorepo. Changes confined to backend `app/` and frontend `src/`. No new top-level packages.

## Complexity Tracking

*No violations requiring justification.*
