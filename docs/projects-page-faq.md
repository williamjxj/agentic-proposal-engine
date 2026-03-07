# Projects Page — FAQ & Design Notes

## 1. Search returns empty (e.g. "fastapi")

**Fix applied:** The backend keyword filter now searches in **title, description, requirements, and skills**. Previously it only searched title + description. Skills are also extracted from job descriptions using common tech terms (Python, FastAPI, React, etc.) when structured skills are missing.

**If still empty:** The HuggingFace dataset (e.g. `jacob-hugging-face/job-descriptions`) may have limited matches. Try:
- Broader terms: "python", "api"
- Use **Discover Jobs** with custom keywords and dataset (e.g. `lukebarousse/data_jobs` has 30K+ jobs)

---

## 2. How to chat with the dataset?

**Status:** Not implemented. Chat/RAG over the job dataset would require:
- Embedding job descriptions into a vector store
- A chat UI that queries by semantic similarity
- LLM to summarize or answer questions

**Workaround:** Use **Discover Jobs** with keywords to explore. The Keywords page lets you save favorite search terms.

---

## 3. Discover Jobs vs Search Projects — What's the difference?

| | **Discover Jobs** | **Search Projects** |
|---|---|---|
| **What it does** | Fetches **new** jobs from HuggingFace using keywords + optional dataset | Filters the **current** list via API (`search` param) |
| **Trigger** | Click "Discover Jobs" → modal → enter keywords → Discover | Type in search box → click Search (or Enter) |
| **Data source** | HuggingFace API (on demand) | Same HuggingFace list API with `?search=X` |
| **Result** | Replaces the visible list with discovered jobs | Refetches list with server-side keyword filter |

**TL;DR:** Discover = "get me new jobs matching X". Search = "filter what I already see by X".

---

## 4. Tabs / Accordion for Discover vs Search

**Implemented:** Tabs or accordion UI to separate Discover Jobs and Search Projects flows.

---

## 5. Generate Proposal button animation

**Fix applied:** The shimmer animation has been removed from the Generate Proposal button.

---

## 6. Top Skill — Why N/A?

**Cause:** Stats come from the current HuggingFace dataset. Skills are derived from:
- `job_requirements` (comma/pipe-separated)
- `job_description` (fallback: common tech terms like Python, FastAPI, React)

**Fix applied:** Added fallback extraction from job descriptions. If the dataset has no structured skills, we now detect common tech terms.

---

## 7. How to tell if a job is from HuggingFace or Freelancer scraper?

**Implemented:** Each project card shows a **source badge**:
- **HuggingFace** — from HF datasets (jacob-hugging-face, lukebarousse, etc.)
- **Freelancer** — from `scripts/freelancer_scraper.py` (data in `data/scraped/`)

**Note:** In development, most jobs are from HuggingFace (`USE_HF_DATASET=true`). The Freelancer scraper writes to JSON files; integration with the projects list API is separate.

---

## 8. How do I know which jobs I already applied to?

**Status:** Not yet implemented. Proposals are linked to jobs via URL params when you click Generate Proposal, but the database does not store `job_id` on proposals.

**To implement:**
1. Add `job_id` (or `project_id`) to the proposals table
2. Populate it when creating a proposal from a project
3. Add an API or client-side check: "Has user submitted a proposal for this job?"
4. Show an "Applied" badge on project cards for matching jobs

---

## Summary of changes

- Search: expanded keyword filter (title, description, requirements, skills)
- Skills: extraction from descriptions when requirements are empty
- Source badge: HuggingFace vs Freelancer on each card
- Generate Proposal: shimmer animation removed
- Docs: this FAQ
