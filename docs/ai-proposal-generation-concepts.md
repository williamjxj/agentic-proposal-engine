# AI Proposal Generation — Concepts & How It All Connects

**Last Updated**: March 8, 2026

This document explains how Knowledge Base, Keywords, Required Skills, and the Collection selector work together when you click **AI Generate** on the proposal form.

---

## 1. Knowledge Base = Your Uploaded Documents

Your **Knowledge Base** is the set of documents you upload via **Knowledge Base** → Upload Document (PDF, DOCX, TXT). Each document is assigned to a **collection** (category) when uploaded:

| Collection | Typical Use |
|------------|-------------|
| **Portfolio** | Project portfolios, demos, work samples |
| **Case Studies** | Success stories, before/after examples |
| **Team Profiles** | Bios, CVs, resumes |
| **Other** | General documents |

**Example:** If you have 2 documents both in the **Portfolio** collection, they are your knowledge base for RAG (Retrieval-Augmented Generation). The AI searches these documents for relevant content when generating proposals.

---

## 2. Knowledge Base Dropdown (Collection Selector)

On the **proposal form** (`/proposals/new`), in the **AI-Powered Proposal Generator** section, there is a **Knowledge base** dropdown. This controls *which collections* the AI searches when you click **AI Generate**.

| Selection | What Gets Searched | Your Portfolio Docs Included? |
|-----------|-------------------|-------------------------------|
| **All collections (default)** | All 4 collections | ✅ Yes |
| **Portfolio** | Only Portfolio | ✅ Yes |
| **Case Studies** | Only Case Studies | ❌ No |
| **Team Profiles** | Only Team Profiles | ❌ No |
| **Other** | Only Other (general_kb) | ❌ No |

**Summary:**
- **Portfolio** or **All collections** → Your 2 Portfolio documents are included in RAG.
- **Other**, **Case Studies**, or **Team Profiles** → None of your Portfolio documents are used (only docs in that specific collection).

---

## 3. Keywords Used

**Where they come from:** The **Keywords** page (`/keywords`).

**Which ones are used:** **All active keywords** are used automatically. There is no per-proposal selection. If you have 2 keyword entries and both are marked **Active**, both are passed to the AI.

**How they're used:** The backend sends them to the LLM prompt as:
> *"MY KEY SKILLS/AREAS (emphasize these when relevant): [your keywords]"*

The AI is instructed to emphasize these skills when they are relevant to the job.

---

## 4. Required Skills

**Where they come from:** The **job description** (from the linked project/job). When you start a proposal from a project, the job's required skills are extracted and passed to the AI.

**How they're used:** They appear in the prompt as:
> *"Skills Needed: [from the job]"*

The AI addresses these requirements explicitly in the proposal.

---

## 5. Are Keywords, Required Skills, and Generate Proposal Bound?

Yes, but not as separate linked entities. They are **all combined into a single AI prompt** when you click **AI Generate**:

```
┌─────────────────────────────────────────────────────────────────┐
│                    AI Proposal Generation                        │
├─────────────────────────────────────────────────────────────────┤
│  Inputs (all fed into one prompt):                              │
│                                                                  │
│  • Knowledge Base (RAG) ──► Docs from selected collection(s)    │
│  • Keywords ──► All active keywords from Keywords page         │
│  • Required Skills ──► From the job description                 │
│  • Strategy ──► Tone and custom instructions                    │
└─────────────────────────────────────────────────────────────────┘
```

The AI sees job context, your portfolio content, your keywords, and the job's required skills all at once. It is instructed to:
- Cite relevant experience from your portfolio
- Emphasize your keywords when appropriate
- Address each requirement from the job description

---

## Quick Reference

| Concept | Source | Used When |
|---------|--------|-----------|
| Knowledge Base | Documents you upload (Knowledge Base page) | AI searches them for RAG context |
| Collection selector | Proposal form dropdown | Limits which collections are searched |
| Keywords | Keywords page (all active) | AI emphasizes them in the proposal |
| Required skills | Job description | AI addresses them in the proposal |
| Strategy | Strategies page | Controls tone and AI instructions |

---

## Related Documentation

- [Knowledge Base](./knowledge-base.md) — Document upload, collections, ChromaDB
- [Proposals](./proposals.md) — API, workflows, draft recovery
- [User Guides](./user-guides.md) — End-to-end workflow
