# 🚀 Quick Start Guide

**Complete guide for setting up and using the Auto-Bidder platform**

---

## Table of Contents

- [For Developers: Setup & Restart](#for-developers-setup--restart)
- [For Users: 3-Step Workflow](#for-users-3-step-workflow)
- [Platform Features](#platform-features)
- [Troubleshooting](#troubleshooting)

---

## For Developers: Setup & Restart

### First-Time Setup

1. **Install Dependencies**
   ```bash
   # Backend
   cd backend
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   
   # Frontend
   cd ../frontend
   npm install
   ```

2. **Configure Environment**
   ```bash
   # Copy example env files
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env
   
   # Edit .env files with your API keys
   ```

3. **Start Services** (see below)

### Starting Services

**Order matters!** Start services in this sequence:

```bash
# 1. Start Docker (PostgreSQL & ChromaDB)
docker-compose up -d
sleep 5  # Wait for services to initialize

# 2. Start Backend (Terminal 1)
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 8000

# 3. Start Frontend (Terminal 2)
cd frontend
npm run dev
```

**Expected Output:**
- Backend: `🚀 Auto-Bidder AI Service starting...` → `✅ Database connection pool initialized`
- Frontend: `Ready on http://localhost:3000`

### Restarting Services

**Quick Restart:**
```bash
# Stop services
lsof -ti:3000 | xargs kill -9 2>/dev/null || true  # Frontend
lsof -ti:8000 | xargs kill -9 2>/dev/null || true  # Backend
docker-compose down

# Clean caches
cd frontend && rm -rf .next node_modules/.cache

# Restart (follow "Starting Services" above)
cd .. && docker-compose up -d
```

**Automated Restart Script:**

Create `restart.sh` in project root:
```bash
#!/bin/bash
set -e

echo "🛑 Stopping services..."
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
docker-compose down

echo "🧹 Cleaning..."
cd frontend && rm -rf .next node_modules/.cache && cd ..

echo "🚀 Starting..."
docker-compose up -d && sleep 5

echo "✅ Ready! Now run:"
echo "  Terminal 1: cd backend && source venv/bin/activate && uvicorn app.main:app --reload"
echo "  Terminal 2: cd frontend && npm run dev"
```

Make executable: `chmod +x restart.sh`

### Verification

```bash
# Check all services are running
lsof -i :3000  # Frontend
lsof -i :8000  # Backend
lsof -i :5432  # PostgreSQL
lsof -i :8001  # ChromaDB

# Test endpoints
curl http://localhost:8000/health
curl http://localhost:3000 | head -20
```

---

## For Users: 3-Step Workflow

The Auto-Bidder platform reduces proposal writing time from **30 minutes to 2 minutes**:

### Step 1: Upload Your Knowledge Base 📚

**Goal:** Provide AI context about your skills, projects, and expertise.

1. Navigate to **Knowledge Base** in the sidebar (⭐ **start here**)
2. Upload your portfolio documents:
   - Case studies (PDF, DOCX, TXT, Markdown)
   - Project documentation
   - Team profiles and client testimonials
   - Technical specifications
3. The system automatically:
   - Extracts text from documents
   - Generates vector embeddings
   - Stores them in ChromaDB for semantic search

**Why this matters:** The AI uses RAG (Retrieval-Augmented Generation) to pull relevant evidence from your knowledge base when generating proposals. Without this, proposals will be generic.

**Best Practices:**
- Upload 5-10 high-quality case studies
- Include specific metrics and outcomes
- Keep documents focused (one project per document)
- Update regularly after completing new projects

---

### Step 2: Configure Your Strategy 🎯

**Goal:** Define how the AI should write your proposals.

1. Go to **Strategies** in the sidebar
2. Create or select a bidding strategy:
   - **Professional/Corporate**: Formal tone for enterprise clients
   - **Casual/Friendly**: Conversational style for startups
   - **Technical**: Deep technical details for developer roles
   - **Custom**: Define your own prompt template
3. Set parameters:
   - Tone and voice preferences
   - Length (conservative ~300 / standard ~500 / aggressive ~800+ words)
   - Key selling points to emphasize

**Pro Tip:** Create multiple strategies for different project types (e.g., "Short-term Contract" vs "Long-term Partnership").

---

### Step 3: Generate Your Proposal 📝

**Goal:** Create a customized, evidence-based proposal in under 60 seconds.

1. Navigate to **Proposals** in the sidebar
2. Click "New Proposal" or paste a job posting URL
3. Fill in the form:
   - **Job Title**: e.g., "Full-Stack Developer for SaaS Platform"
   - **Job Description**: Copy-paste full requirements
   - **Platform**: Upwork, Freelancer, Fiverr, etc.
   - **Budget**: Your proposed rate
   - **Timeline**: Estimated delivery time
4. Select your bidding strategy
5. Click **Generate AI Proposal**
6. The AI will:
   - Extract keywords from job description
   - Search your knowledge base for relevant projects
   - Construct an optimized prompt
   - Generate a tailored proposal with citations
7. Review, edit, and finalize
8. Export to PDF/DOCX or copy to clipboard

**What happens behind the scenes:**
```
Job Input → Keyword Extraction → Vector Search → Retrieve Context → LLM Generation → Your Proposal
```

---

## Platform Features

### 📊 Dashboard
**Your command center** - See overview of active proposals, recent activity, win rate stats, and quick shortcuts.

**Use it:** Starting point after login to see progress at a glance.

---

### 💼 Projects
**Job discovery and tracking** - Discover jobs from HuggingFace datasets, track applications, monitor status (draft/submitted/won/lost).

**Use it:** 
- Discover jobs with keyword search
- View job details (skills, budget, platform)
- Track multiple applications
- Click "Generate Proposal" to start the workflow

**New Feature:** HuggingFace dataset integration provides mock job postings for development and testing.

---

### 📝 Proposals
**AI proposal generation and draft management** - Real-time editor with streaming AI responses, draft versioning, auto-save, conflict resolution.

**Use it:** 
- Generate new proposals (your main workflow!)
- Edit and refine AI-generated drafts
- Manage proposal versions
- Export to PDF, DOCX, or copy to clipboard

**Key Features:**
- **Streaming responses**: Watch the AI write in real-time
- **Context citations**: See which documents the AI referenced
- **Auto-save**: Saves every 3 seconds - never lose work
- **Job context**: Pre-fills from Projects page

---

### 📚 Knowledge Base
**Your portfolio document library** - Upload, organize, and manage documents. View metadata (upload date, size, word count, embedding status).

**Use it:**
- ⭐ **First-time setup**: Upload portfolio before generating proposals
- Add new case studies after completing projects
- Update team member profiles
- Remove outdated content

---

### 🎯 Strategies
**AI prompt template management** - Pre-built templates, custom editor, tone/length/focus parameters, preview tools.

**Use it:**
- Before first proposal: Select a default strategy
- Target different client types
- A/B test different proposal styles
- Fine-tune AI behavior for your brand voice

**Strategy Components:**
- **System Prompt**: Core instructions for the AI
- **Tone Settings**: Formal, casual, technical, etc.
- **Length**: Word count preferences
- **Focus Areas**: Emphasize speed, quality, cost, etc.

---

### 🔑 Keywords
**Smart job filtering** - Define skill keywords, technologies, job matching criteria, exclusion filters, performance analytics.

**Use it:**
- Filter job boards efficiently
- Define your niche and specializations
- Avoid irrelevant postings
- Track which keywords lead to wins

**Example Keywords:**
- Technologies: `React`, `Node.js`, `PostgreSQL`, `AWS`
- Services: `Full-Stack Development`, `API Integration`, `DevOps`
- Industries: `FinTech`, `Healthcare`, `E-commerce`

---

### 📈 Analytics
**Performance tracking** - Win rate, time saved, platform-specific performance, proposal effectiveness, revenue tracking.

**Use it:**
- Weekly review of bidding performance
- Identify which strategies work best
- Compare platform ROI
- Track time savings and efficiency gains

**Key Metrics:**
- **Win Rate**: Proposals sent vs. jobs won
- **Response Rate**: Client replies to your proposals
- **Average Time**: Under 2 minutes with AI (vs. 30 minutes manually)

---

### ⚙️ Settings
**Account and preferences** - Profile info, API key management (OpenAI, DeepSeek), defaults, theme (light/dark), notifications.

**Use it:**
- Initial account setup
- Update API credentials
- Customize experience
- Manage preferences

---

## Typical User Flow

**Daily workflow:**

1. **Morning**: Check **Dashboard** for opportunities and responses
2. **Discover Jobs**: Use **Projects** page with keyword filters
3. **Generate Proposals**: 
   - Click "Generate Proposal" on job card
   - AI generates draft in 30-60 seconds
   - Review and personalize
   - Submit on job platform
4. **Track Progress**: Update status in **Projects**
5. **Weekly Review**: Check **Analytics** to optimize strategy
6. **Continuous Improvement**: Add new case studies to **Knowledge Base**

---

## 💡 Pro Tips

### For Best Results:

1. **Start with quality knowledge base content**  
   Upload 5-10 detailed case studies before your first proposal. The AI is only as good as the context you provide.

2. **Create project-specific strategies**  
   Use different strategies for enterprise clients vs. startup gigs. Tone matters!

3. **Review and personalize**  
   The AI generates 90% of the work, but add a personal touch. Mention something specific from the job posting.

4. **Track what works**  
   Use Analytics to identify winning patterns. Double down on what works.

5. **Keep your knowledge base fresh**  
   Update monthly with new projects, testimonials, and skills.

### Common Pitfall to Avoid:

❌ **Don't skip the Knowledge Base step**  
Without uploaded documents, the AI generates generic proposals. The magic happens when it can cite your real projects.

---

## Troubleshooting

### Port Already in Use
```bash
# Find what's using the port
lsof -i :3000  # or :8000, :5432, :8001
lsof -i :8000

# Kill specific process
kill -9 <PID>
```

### Docker Issues
```bash
# Reset Docker services (removes volumes)
docker-compose down -v
docker-compose up -d
```

### Backend Module Not Found
```bash
# Ensure venv is activated and dependencies installed
cd backend
source venv/bin/activate
pip install -r requirements.txt
```

### Frontend Build Issues
```bash
cd frontend
rm -rf .next node_modules
npm install
npm run dev
```

### Database Connection Errors
```bash
# Check PostgreSQL is running
docker-compose ps

# Restart PostgreSQL
docker-compose restart postgres

# Check DATABASE_URL in backend/.env
```

### ChromaDB Errors
```bash
# Clear ChromaDB data
rm -rf backend/chroma_db/*

# Restart ChromaDB
docker-compose restart chromadb

# Re-upload documents in Knowledge Base
```

---

## 🆘 Additional Resources

- 📖 **Architecture**: [ARCHITECTURE_DIAGRAM.md](./2-architecture/ARCHITECTURE_DIAGRAM.md)
- 🔧 **Implementation**: [IMPLEMENTATION_STRATEGY.md](./3-guides/IMPLEMENTATION_STRATEGY.md)
- 🚀 **Production Deployment**: [PRODUCTION_DEPLOYMENT.md](./3-guides/PRODUCTION_DEPLOYMENT.md)
- 📊 **Progress**: [PROGRESS.md](./4-status/PROGRESS.md)

---

## 🎉 You're Ready!

**Developers**: Services should be running on:
- Frontend: http://localhost:3000
- Backend: http://localhost:8000
- API Docs: http://localhost:8000/docs

**Users**: Follow the 3-step workflow to start generating winning proposals in minutes instead of hours. Happy bidding! 🚀
