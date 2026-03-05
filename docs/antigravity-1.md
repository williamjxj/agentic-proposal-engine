# Auto-Bidder: Agentic AI Proposal Engine
## Technical POC & MVP Executive Summary (For Funding Application)

### 1. Project Vision
Auto-Bidder is a Next-Generation AI Agent designed to automate and optimize the high-stakes proposal process for freelancers and digital agencies. By combining **Retrieval-Augmented Generation (RAG)** with **Dynamic Bidding Strategies**, the platform generates hyper-personalized, context-aware proposals that significantly increase conversion rates.

### 2. Core "Agentic" Architecture
Unlike basic template-based generators, Auto-Bidder utilizes an **Orchestration Layer** ([AIService](cci:2://file:///Users/william.jiang/my-apps/auto-bidder/backend/app/services/ai_service.py:28:0-215:125)) that acts as a cognitive agent:
- **Contextual Memory (RAG)**: Uses **ChromaDB** and semantic embeddings to "remember" the user's past work, portfolio, and skills.
- **Strategy-Driven Persona**: A user-defined "Strategy" (Tone, Focus Areas, System Prompts) governs every interaction, ensuring the AI maintains a consistent professional identity.
- **Multi-Model Intelligence**: Seamlessly switches between high-reasoning models (**GPT-4-Turbo**) and high-efficiency models (**DeepSeek-Chat**) to optimize for both quality and cost.

### 3. Current Implementation Status (POC Complete)
✅ **Job Discovery Engine**: Integrated with Hugging Face datasets for real-world job data ingestion.
✅ **Intelligent Vector Search**: Automated semantic retrieval of relevant portfolio chunks for every new job posting.
✅ **Automated Proposal Orchestration**: A specialized [AIService](cci:2://file:///Users/william.jiang/my-apps/auto-bidder/backend/app/services/ai_service.py:28:0-215:125) that combines job context, strategy rules, and portfolio data into a final winning proposal.
✅ **JWT-Powered Security**: Production-ready authentication for multi-user isolation.

### 3.1 Latest Implementation Summary (Spec 001)
Recent improvements (branch: `001-auto-bidder-improvements`) focused on proposal quality, workflow integration, and UX polish:

| Area | Changes |
|------|---------|
| **RAG & AI** | Per-user RAG collections, citation verification, stronger system prompts, per-user embedding lock |
| **Proposal Workflow** | `generateProposalFromJob` API; Projects page → Generate Proposal → new proposal form with job prefill; draft conflict handling and recovery |
| **Discovery** | User keywords fallback for empty discover; keyword pre-fill from saved keywords; supports empty keywords (backend uses user defaults) |
| **Knowledge Base** | Document status badges (success/error), error mapping in document service |
| **Frontend** | Session and analytics re-enabled; URL fixes in API client; Projects page React key fixes for list rendering |
| **Docs** | `PROPOSAL_WORKFLOW_INTEGRATION.md` updated with full workflow |

### 4. Technical Stack
- **Backend**: Python 3.12, FastAPI (Async), Langchain v0.1.
- **Database**: PostgreSQL (Relational) + ChromaDB (Vector Search).
- **Core AI**: OpenAI API (Models: GPT-4-Turbo) + DeepSeek API.
- **Embeddings**: Local `SentenceTransformer` (sentence-transformers/all-MiniLM-L6-v2) for high-speed, cost-effective vector search.

### 5. Roadmap to Market (MVP Phase)
1. **Live Platform Integration**: Transitioning from static datasets to real-time Upwork/Freelancer API connectors.
2. **Credential Vault**: AES-256 encryption for secure storage of user platform credentials.
3. **Analytics & Optimization**: Feedback loop to track proposal success and automatically refine bidding strategies.
