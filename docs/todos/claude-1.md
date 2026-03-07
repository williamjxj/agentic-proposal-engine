# TODO

Ignore the following for now!

Not yet implemented. Will do in the future.

## 🔍 What Your App Currently Has

Based on the README and repo structure:

| Layer | What's There |
|---|---|
| **Scraping** | Crawlee (manual/on-demand trigger) |
| **RAG** | ChromaDB + LangChain + OpenAI GPT-4-turbo |
| **Auth/DB** | Supabase (PostgreSQL) |
| **Frontend** | Next.js 15, TanStack Query, shadcn/ui |
| **Backend** | FastAPI, Pydantic models, routers |
| **Infra** | Docker, Vercel/Railway deploy |

---

## 🚨 What's Missing / What Needs to Improve

### 1. Auto Scraping — Not Truly Autonomous

Your Crawlee setup runs **on-demand**, not on a schedule. There's no scheduler, no retry logic, no deduplication guard, and no multi-platform support. It just scrapes when something triggers it manually.

**What you need:**
- A background task scheduler (APScheduler or Celery + Redis)
- Rotating proxies + anti-bot headers (Playwright stealth mode)
- Multi-platform support: Upwork API, LinkedIn Jobs, Indeed, Freelancer
- Deduplication fingerprinting in ChromaDB or Supabase so the same job isn't re-processed

```python
# backend/app/scheduler.py - example
from apscheduler.schedulers.asyncio import AsyncIOScheduler

scheduler = AsyncIOScheduler()

@scheduler.scheduled_job("interval", minutes=30)
async def auto_scrape_jobs():
    await scrape_upwork(keywords=user_keywords)
    await scrape_linkedin(keywords=user_keywords)
    await deduplicate_and_store()
```

---

### 2. No Multi-Tier Agentic Architecture (The Biggest Gap)

Right now you have a **single LLM call** pattern: scrape → match → generate proposal. This is not truly agentic. The 2025/2026 standard is a **supervisor + specialist agents** model — exactly what LangGraph or CrewAI enable.

**What you need — a 3-tier agent hierarchy:**

```
Tier 1: Orchestrator Agent (LangGraph StateGraph)
    ├── Tier 2: Scraper Agent       → fetches & normalizes jobs
    ├── Tier 2: Matcher Agent       → scores job-to-profile fit
    ├── Tier 2: Proposal Agent      → drafts personalized proposal
    └── Tier 2: Submission Agent    → sends via platform API / Selenium
              ↑
         Tier 3: Tools
              ├── ChromaDB RAG tool
              ├── Upwork/platform API tool
              ├── Memory (cross-session context)
              └── Human-in-loop gate (optional approve step)
```

LangGraph treats agent steps as nodes in a directed graph, making it ideal for complex multi-step tasks where you need precise control over branching and error handling. This is exactly what your autobidder needs — conditional routing: "if match score > 85%, auto-send; if 60–85%, queue for human review; if < 60%, discard."

---

### 3. Auto-Send Is Missing

The UI currently lets users *view* matched proposals but there's no automated submission layer. To hit your target:

- **For Upwork**: use the Upwork API (covers proposal submission programmatically)
- **For other platforms**: Playwright automation to fill and submit forms
- **Gate logic**: only auto-send when confidence score exceeds a threshold

```python
# Submission agent logic
async def submission_agent(proposal: Proposal, job: Job):
    if proposal.confidence_score >= 0.85:
        await auto_submit(proposal, job)   # fire and forget
    elif proposal.confidence_score >= 0.60:
        await queue_for_review(proposal)   # human-in-loop
    else:
        await archive(job, reason="low_match")
```

---

### 4. RAG Is Basic — Needs Memory + Feedback Loop

Currently ChromaDB just stores static portfolio docs. There's no learning from outcomes. You need:

- **Win/loss feedback**: when a proposal wins, tag those embeddings as high-value context for future generations
- **Cross-session memory**: persist user preferences, style, past bids so the agent improves over time
- **Dynamic re-ranking**: use past win-rate signals to weight retrieved context

---

### 5. No Real-Time Streaming in UI

Proposal generation happens as a blocking call. The UX feels slow. Add **Server-Sent Events (SSE)** or WebSocket streaming so the user sees the proposal being written token by token — this alone dramatically improves the feel of the tool.

```python
# FastAPI SSE endpoint
@router.get("/proposals/stream/{job_id}")
async def stream_proposal(job_id: str):
    async def event_generator():
        async for token in llm.astream(prompt):
            yield f"data: {token}\n\n"
    return StreamingResponse(event_generator(), media_type="text/event-stream")
```

---

### 6. No Observability / Tracing

Regardless of framework, you need evaluation and monitoring from the start — simulation, observability, alerts, and a mechanism for human review of agent responses. Your app has none of this. Add **LangSmith** (free tier) or **Langfuse** to trace every agent step, see what RAG retrieved, and debug why proposals fail.

---

## 🗺️ Recommended Upgrade Roadmap

### Phase 1 — Autonomous Scraping (1–2 weeks)
- Add APScheduler for periodic scraping every 30 min
- Add Playwright stealth + proxy rotation
- Add Supabase deduplication table with job fingerprints
- Expose `/api/scrape/status` endpoint for UI polling

### Phase 2 — LangGraph Multi-Agent Core (2–3 weeks)
- Replace the single LangChain chain with a LangGraph `StateGraph`
- Define 4 nodes: `scraper_node → matcher_node → proposal_node → submission_node`
- Add conditional edges for confidence-score routing
- LangGraph enables explicit state machines and error handling for multi-step/multi-agent flows, and pairs well with LangSmith for observability.

### Phase 3 — Auto-Send + Platform APIs (2 weeks)
- Integrate Upwork API for programmatic submission
- Build Playwright-based fallback for platforms without APIs
- Add human-in-loop UI: "You have 3 proposals pending approval"
- Add a Supabase `submissions` table to track send history

### Phase 4 — Adaptive RAG + Feedback Loop (2 weeks)
- Add win/loss tagging to proposals in Supabase
- Re-embed winning proposals back into ChromaDB with boosted weight
- Add cross-session user memory (preferred tone, rate, stack)
- Integrate LangSmith/Langfuse tracing

### Phase 5 — UI Polish + Streaming (1 week)
- Replace blocking API calls with SSE streaming in the proposal editor
- Add real-time agent status panel: "Scraping Upwork... Matching 12 jobs... Drafting proposal..."
- Add a dashboard showing win rate trends over time

---

## 🧱 Concrete Tech Choices

| Need | Recommendation |
|---|---|
| Multi-agent orchestration | **LangGraph** (best for your branching control logic) |
| Background scheduler | **APScheduler** (simple) or **Celery + Redis** (scalable) |
| Anti-bot scraping | **Playwright stealth** + **Browserless.io** or **Bright Data** |
| Platform APIs | **Upwork API** + **LinkedIn Jobs API** |
| Streaming proposals | **FastAPI SSE** + React `EventSource` hook |
| Observability | **LangSmith** (free) or **Langfuse** (self-hostable) |
| Feedback/memory | **mem0** or custom ChromaDB feedback embeddings |

Your foundation (FastAPI + Next.js + ChromaDB + Supabase) is solid — the core upgrade is replacing the single-shot LLM call with a proper LangGraph agent graph, adding a scheduler, and wiring up auto-submission. Those three changes alone transform it from a "proposal drafting tool" into a genuinely autonomous bidding agent.
