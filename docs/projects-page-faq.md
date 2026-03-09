# Projects Page — FAQ & Design Notes

## Latest Implementation Summary

- **Toolbar:** Single-row layout with search input, Filters, Search, Discover, and Add manually. No tabs.
- **Stats:** Compact inline boxes (Total Data, Total Opportunities, Data Source, Filter Keywords) in one row. Filter Keywords extends to fit content.
- **Keyword filter:** Searches title, description, requirements, skills, and `model_response` (HF dataset).
- **Repeat-apply prevention:** Projects page fetches applied job IDs; shows "Applied" badge and "View Proposal" for jobs with draft/submitted proposals.
- **Source badge:** HuggingFace vs Freelancer on each card.

---

## 1. Search returns empty (e.g. "fastapi")

**Fix applied:** Keyword filter searches title, description, requirements, skills, and `model_response`.

**If still empty:** Try broader terms or use **Discover** with a different dataset (e.g. `lukebarousse/data_jobs`).

---

## 2. How to chat with the dataset?

**Status:** Not implemented. Workaround: use **Discover** with keywords or the Keywords page.

---

## 3. Discover vs Search — What's the difference?

| | **Discover** | **Search** |
|---|---|---|
| **Action** | Fetches new jobs from HuggingFace with custom keywords | Filters current list by search keywords |
| **Trigger** | Click Discover → modal → keywords → Discover | Type in box → Search |
| **Result** | Replaces list with discovered jobs | Refetches list with filter |

---

## 4. How do I know which jobs I already applied to?

**Implemented.** Proposals store `job_identifier`. The Projects page:
1. Shows an "Applied" badge on cards for jobs with draft or submitted proposals
2. Replaces "Generate Proposal" with "View Proposal" (links to /proposals) to prevent repeat applications

---

## 5. Source badge (HuggingFace vs Freelancer)

Each card shows a source badge. In development, most jobs are from HuggingFace (`USE_HF_DATASET=true`).

---

## 6. Generate Proposal button

No shimmer animation. Disabled/replaced with "View Proposal" for already-applied jobs.
