# Auto-Bidder Documentation

## Quick Navigation

### Getting Started
- **[QUICKSTART](1-getting-started/QUICKSTART.md)** – Setup, run, and verify the app (developers)
- **[SETUP_AUTH](SETUP_AUTH.md)** – Authentication and JWT configuration

### UI & User Workflows
- **[PROPOSAL_WORKFLOW_INTEGRATION](PROPOSAL_WORKFLOW_INTEGRATION.md)** – End-to-end flow: Discover Jobs → Generate Proposal → Submit
- **[HUGGINGFACE_INTEGRATION](HUGGINGFACE_INTEGRATION.md)** – How job discovery works (HuggingFace datasets in the Projects UI)

### Web Scraping & Job Discovery
- **[SCRAPING_STATUS](SCRAPING_STATUS.md)** – Web scraping status (planned, not implemented); recommends HuggingFace datasets for now
- **Current approach:** Use HuggingFace datasets via Projects → Discover Jobs (see HUGGINGFACE_INTEGRATION)

### Architecture & Diagrams
- **[diagrams/](diagrams/)** – Mermaid diagrams (architecture, auth flow, workflow, quickstart)
- **[2-architecture/ARCHITECTURE_DIAGRAM](2-architecture/ARCHITECTURE_DIAGRAM.md)** – Detailed system design (ASCII)

### Deployment & Strategy
- **[3-guides/PRODUCTION_DEPLOYMENT](3-guides/PRODUCTION_DEPLOYMENT.md)** – Production deployment checklist
- **[3-guides/IMPLEMENTATION_STRATEGY](3-guides/IMPLEMENTATION_STRATEGY.md)** – 12-step implementation plan
- **[auto-bidder_production_saas_plan](auto-bidder_production_saas_plan.md)** – SaaS roadmap and resource checklist
- **[antigravity-1](antigravity-1.md)** – Technical POC summary (funding/executive)

### Status
- **[4-status/PROGRESS](4-status/PROGRESS.md)** – Implementation progress and phase completion

---

## Doc Categories

| Category | Purpose |
|----------|---------|
| **UI / User Operations** | How to use the app: QUICKSTART, PROPOSAL_WORKFLOW_INTEGRATION, HUGGINGFACE_INTEGRATION |
| **Web Scraping** | Future plans and alternatives: SCRAPING_STATUS (real scraping not implemented; use HuggingFace) |
| **Setup** | Dev environment: QUICKSTART, SETUP_AUTH |
| **Architecture** | System design: diagrams/, 2-architecture/ |
| **Deployment** | Production: PRODUCTION_DEPLOYMENT, auto-bidder_production_saas_plan |
