# Documentation Index
## Agentic Proposal Engine (Best IT Consulting)

Welcome to the Agentic Proposal Engine documentation. This folder contains all project documentation organized by category.

**Last Updated**: March 11, 2026

---

## 📂 Documentation Structure

### 📊 Business & Planning

**[business-plan/](business-plan/)** - Government Loan Application Package
- Complete business plan, financial projections, market analysis
- Government program guides (BDC, IRAP, Innovate BC)
- Competitive analysis and risk assessment
- **Primary Use**: Loan applications, investor presentations
- **Total**: 293 KB, 8 documents

**[saas-roadmap.md](saas-roadmap.md)** - Product roadmap and strategic planning

---

### 🏗️ Architecture & Setup

**Technical Architecture**:
- [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md) - System architecture overview
- [database-schema-reference.md](database-schema-reference.md) - PostgreSQL schema and relationships
- [chromadb-setup.md](chromadb-setup.md) - Vector database setup
- [chromadb-upgrade-guide.md](chromadb-upgrade-guide.md) - ChromaDB migration guide

**Setup & Deployment**:
- [setup-and-run.md](setup-and-run.md) - Quick start guide
- [setup-auth.md](setup-auth.md) - Authentication setup
- [production-deployment.md](production-deployment.md) - Production deployment guide

---

### 🤖 AI & Automation Features

**Core AI Features**:
- [ai-proposal-generation-concepts.md](ai-proposal-generation-concepts.md) - RAG and AI concepts
- [knowledge-base.md](knowledge-base.md) - Knowledge base management
- [proposals.md](proposals.md) - Proposal generation workflow

**Autonomous Features**:
- [autonomous-automation-strategy.md](autonomous-automation-strategy.md) - Autonomous bidding strategy
- [autonomous-implementation-guide.md](autonomous-implementation-guide.md) - Implementation guide
- [quick-wins-autonomous.md](quick-wins-autonomous.md) - Quick autonomous improvements

---

### 📈 Features & Functionality

**Data & ETL**:
- [etl-scheduler-guide.md](etl-scheduler-guide.md) - Job discovery ETL pipelines
- [huggingface-job-discovery.md](huggingface-job-discovery.md) - HuggingFace integration
- [web-scraping-status.md](web-scraping-status.md) - Freelancer.com scraping

**User Interface**:
- [dashboard.md](dashboard.md) - Dashboard features
- [proposal-workflow-ui.md](proposal-workflow-ui.md) - Proposal UI/UX
- [projects-page-faq.md](projects-page-faq.md) - Projects page documentation

**Analytics & Monitoring**:
- [analytics.md](analytics.md) - Analytics and metrics
- [email-system.md](email-system.md) - Email notifications

---

### 🔧 Implementation Guides

**Recent Implementations**:
- [005-refactor-implementation-summary.md](005-refactor-implementation-summary.md) - PostgreSQL refactor summary
- [chromadb-implementation-summary.md](chromadb-implementation-summary.md) - ChromaDB integration summary
- [implementation-progress.md](implementation-progress.md) - Overall implementation progress

---

### 📖 User & Developer Guides

- [user-guides.md](user-guides.md) - End-user documentation
- [diagrams/workflow-diagram.md](diagrams/workflow-diagram.md) - User workflow diagrams
- [diagrams/auth-flow-diagram.md](diagrams/auth-flow-diagram.md) - Authentication flows
- [diagrams/quickstart-flow-diagram.md](diagrams/quickstart-flow-diagram.md) - Quick start flows

---

### 📝 Planning & TODOs

**[todos/](todos/)** - Task lists and planning documents
- [todos/03.md](todos/03.md) - Current tasks
- [todos/autobidder-etl-rag-schema-spec.md](todos/autobidder-etl-rag-schema-spec.md) - ETL/RAG specs
- [todos/claude-1.md](todos/claude-1.md) - Claude session notes

---

## 🚀 Quick Navigation

### For New Developers
1. Start with [setup-and-run.md](setup-and-run.md)
2. Review [diagrams/architecture-diagram.md](diagrams/architecture-diagram.md)
3. Read [database-schema-reference.md](database-schema-reference.md)

### For Business / Investors
1. Read [business-plan/README.md](business-plan/README.md)
2. Review [business-plan/business-plan.md](business-plan/business-plan.md)
3. Check [business-plan/financial-projections.md](business-plan/financial-projections.md)

### For Feature Development
1. Check [saas-roadmap.md](saas-roadmap.md) for priorities
2. Review relevant feature docs (autonomous, proposals, analytics)
3. Follow [implementation-progress.md](implementation-progress.md)

### For Deployment
1. [production-deployment.md](production-deployment.md)
2. [setup-auth.md](setup-auth.md)
3. [chromadb-setup.md](chromadb-setup.md)

---

## 📊 Documentation Stats

- **Total Documents**: 42 files
- **Categories**: 7 (Business, Architecture, AI, Features, Implementation, Guides, Planning)
- **Diagrams**: 5 files
- **Business Documents**: 8 files (293 KB)
- **Recent Additions**: business-plan/ folder (March 11, 2026)

---

## 🔄 Document Lifecycle

### Active Documents (Update Regularly)
- [saas-roadmap.md](saas-roadmap.md) - Monthly updates
- [implementation-progress.md](implementation-progress.md) - Weekly updates
- [todos/](todos/) - Daily/weekly updates
- [business-plan/](business-plan/) - Update before funding applications

### Reference Documents (Update as Needed)
- Architecture diagrams - Update when system changes
- Setup guides - Update when dependencies change
- Feature docs - Update when features launch

### Archive Candidates (Consider Moving to /archive)
- [005-refactor-implementation-summary.md](005-refactor-implementation-summary.md) - Once refactor complete
- Outdated implementation summaries

---

## 📝 Contributing to Docs

When adding new documentation:

1. **Choose appropriate location**:
   - Business/funding → `business-plan/`
   - Technical architecture → main `docs/` or `diagrams/`
   - Feature specs → main `docs/` (consider feature-specific folder)
   - Implementation notes → `todos/` or main `docs/`

2. **Follow naming conventions**:
   - Use lowercase, hyphen-separated: `feature-name.md`
   - Be descriptive: `email-system.md` not `email.md`
   - Add dates to summaries: `005-refactor-implementation-summary.md`

3. **Include metadata**:
   - **Created**: Date
   - **Last Updated**: Date
   - **Purpose**: Brief description
   - **Related Docs**: Links to related documentation

4. **Update this README.md** when adding new categories or major documents

---

## 🔍 Search Tips

**Find technical setup info**:
```bash
grep -r "setup" docs/*.md
```

**Find business metrics**:
```bash
grep -r "revenue\|MRR\|TAM" docs/business-plan/*.md
```

**Find TODO items**:
```bash
grep -r "TODO\|FIXME" docs/*.md
```

---

## 📞 Contacts & Resources

- **Company**: Best IT Consulting (bestitconsulting.ca)
- **Founder**: William Jiang ([LinkedIn](https://www.linkedin.com/in/william-jiang-226a7616/))
- **GitHub**: williamjxj/agentic-proposal-engine
- **Location**: Surrey, British Columbia, Canada

---

**Maintained By**: William Jiang, Founder  
**Last Review**: March 11, 2026  
**Next Review**: April 2026 (after funding application)
