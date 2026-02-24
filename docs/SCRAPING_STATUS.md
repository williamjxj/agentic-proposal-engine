# Scraping Logic: Status and Implementation Guide

**Last Updated:** February 23, 2026  
**Status:** 🔴 **NOT IMPLEMENTED** (Planned for Phase 3)

> **💡 RECOMMENDED APPROACH:** Start with mock datasets from HuggingFace/Kaggle instead of web scraping!  
> Build the full proposal workflow in 1-2 weeks using realistic job data, then optionally add real scraping later.  
> See [Alternative Approach: Mock Datasets](#alternative-approach-mock-datasets-recommended-for-phase-1) below.

---

## Executive Summary

The job scraping functionality is **planned but not yet implemented** in the Auto-Bidder platform. While the database schema, error handling, and dependencies are prepared, no actual scraping service or logic exists in the codebase. 

**NEW STRATEGY:** Instead of starting with complex web scraping, this guide now recommends using **public datasets** (HuggingFace, Kaggle) as mock data sources for initial development. This approach:

- ✅ Accelerates development by 2-3 weeks
- ✅ Eliminates legal and technical scraping challenges  
- ✅ Provides reproducible test data
- ✅ Allows easy migration to real scraping later

This document outlines both approaches: mock dataset integration (recommended first) and real web scraping (optional later).

---

## Quick Comparison: Mock Datasets vs. Web Scraping

| Factor | Mock Datasets (Recommended First) | Real Web Scraping (Optional Later) |
|--------|----------------------------------|-------------------------------------|
| **Time to Implement** | 1-2 weeks | 3-4 weeks |
| **Complexity** | Low - CSV/JSON parsing | High - Browser automation, anti-bot |
| **Cost** | Free | Proxies, API keys, infrastructure |
| **Legal Risk** | None - public datasets | Platform ToS violations possible |
| **Data Quality** | Consistent, structured | Fresh, real-time, but fragile |
| **Testing** | Reproducible, controlled | Variable, requires mocking |
| **Maintenance** | None - static data | High - UI changes break scrapers |
| **Rate Limits** | No limits | Must respect platform limits |
| **Use Case** | Development, testing, MVP | Production, real-time discovery |
| **Migration Effort** | Easy - feature flag toggle | N/A |

**Verdict:** Start with mock datasets, add real scraping only if you need real-time job discovery in production.

---

## Current State

### ✅ What Exists (Preparation)

#### 1. Database Schema
**Location:** [database/migrations/003_biddinghub_merge.sql](../database/migrations/003_biddinghub_merge.sql#L118-L143)

```sql
CREATE TABLE scraping_jobs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Job Configuration
  platform VARCHAR(50) NOT NULL,
  search_terms TEXT[] DEFAULT ARRAY[]::TEXT[],
  max_results INT DEFAULT 20,
  
  -- Execution Status
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Results
  jobs_found INT DEFAULT 0,
  jobs_new INT DEFAULT 0,
  jobs_duplicated INT DEFAULT 0,
  error_message TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose:** Tracks scraping job execution, configuration, and results.

#### 2. Error Handling
**Location:** [backend/app/core/errors.py](../backend/app/core/errors.py#L44-L45)

```python
class ScrapingError(AutoBidderError):
    """Exception raised during job scraping."""
```

**Purpose:** Custom exception for scraping-related errors (currently unused).

#### 3. Dependencies
**Location:** [backend/requirements.txt](../backend/requirements.txt#L34-L37)

```python
# Web Scraping (crawlee removed temporarily due to dependency conflicts)
# crawlee will be added in Phase 3 when implementing scraping
# For now, we'll use beautifulsoup4 + playwright directly
playwright==1.41.1
beautifulsoup4==4.12.3
lxml==5.1.0
```

**Note:** Crawlee was removed due to dependency conflicts and will be re-added in Phase 3.

#### 4. Platform Credentials Storage
**Location:** [database/migrations/003_biddinghub_merge.sql](../database/migrations/003_biddinghub_merge.sql#L92-L114)

```sql
CREATE TABLE platform_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Platform Identification
  platform VARCHAR(50) NOT NULL,
  
  -- Credentials (store encrypted in production)
  api_key TEXT,
  api_secret TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  verification_error TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Purpose:** Store user credentials for platform APIs (Upwork, Freelancer, etc.).

### ❌ What's Missing (Not Implemented)

1. **No Scraper Service:** No `scraper_service.py` in [backend/app/services/](../backend/app/services/)
2. **No Scraper Router:** No API endpoints in [backend/app/routers/](../backend/app/routers/)
3. **No Scraping Models:** No Pydantic models for scraping jobs
4. **No Platform Implementations:** No Upwork/Freelancer scraper logic
5. **No Background Workers:** No scheduled/async job execution

---

## Planned Architecture

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                      Frontend (Next.js)                      │
│  - Job Discovery Dashboard                                   │
│  - Platform Configuration UI                                 │
│  - Search Term Management                                    │
└────────────────────┬────────────────────────────────────────┘
                     │ HTTP/WebSocket
┌────────────────────▼────────────────────────────────────────┐
│                    Backend API (FastAPI)                     │
│  - POST /api/scrapers/start                                  │
│  - GET  /api/scrapers/jobs                                   │
│  - GET  /api/scrapers/jobs/{id}                              │
│  - WebSocket /ws/scraping (real-time status)                 │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                   Scraper Service Layer                      │
│  - ScraperService (orchestrator)                             │
│  - UpworkScraper (platform-specific)                         │
│  - FreelancerScraper (platform-specific)                     │
│  - DataNormalizer (clean & transform)                        │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│              Crawlee/Playwright Engine                       │
│  - Browser automation                                        │
│  - Proxy management                                          │
│  - Anti-bot evasion                                          │
│  - Rate limiting                                             │
└────────────────────┬────────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────────┐
│                      Data Storage                            │
│  - scraping_jobs (job metadata)                              │
│  - projects (normalized job data)                            │
│  - platform_credentials (API keys/tokens)                    │
└──────────────────────────────────────────────────────────────┘
```

### Tech Stack

| Component | Technology | Purpose |
|-----------|-----------|---------|
| **Orchestration** | Crawlee (Python) | Manage scraping workflows, handle retries |
| **Browser Automation** | Playwright | Headless browser for dynamic content |
| **HTML Parsing** | BeautifulSoup4 | Extract data from HTML |
| **Background Jobs** | AsyncIO + APScheduler | Schedule periodic scraping |
| **API Integration** | HTTPX | Direct API calls (when available) |

---

## Planned Workflow

### Job Discovery Workflow

```
1. User Configuration
   ├── Select platform (Upwork, Freelancer, etc.)
   ├── Define search terms/keywords
   ├── Set filters (budget, timeline, skills)
   └── Configure max results limit

2. Job Creation & Queueing
   ├── Create scraping_job record (status: 'pending')
   ├── Store configuration in database
   └── Trigger background worker

3. Scraping Execution
   ├── Update status to 'running'
   ├── Initialize Crawlee/Playwright session
   ├── Platform-specific scraping logic:
   │   ├── Upwork: Stealth scraping with proxy rotation
   │   ├── Freelancer: RSS feed + API consumer
   │   └── Others: Custom scrapers
   ├── Handle pagination and rate limits
   └── Extract raw job data

4. Data Normalization
   ├── Clean HTML content (remove scripts, styles)
   ├── Extract structured fields:
   │   ├── title
   │   ├── description
   │   ├── budget/rate
   │   ├── timeline
   │   ├── required_skills[]
   │   └── client_info
   ├── Convert to standard JSON schema
   └── De-duplicate against existing jobs

5. Storage & Indexing
   ├── Store in projects table
   ├── Update scraping_job results:
   │   ├── jobs_found
   │   ├── jobs_new
   │   └── jobs_duplicated
   ├── Update status to 'completed' or 'failed'
   └── Store error_message if failed

6. Matching & Alerts (Future)
   ├── Run keyword/semantic matching
   ├── Identify "High Value" opportunities
   ├── Send notifications to user
   └── Display in Projects Dashboard
```

### Integration with Proposal Generation

**Flow:** Scraped Jobs → RAG Context → AI Proposal

1. **Job Selection:** User selects a scraped job from Projects Dashboard
2. **Context Gathering:** 
   - Extract keywords from job description
   - Search knowledge base for relevant experience
   - Retrieve competitive intelligence from web scraping
3. **RAG Processing:** Semantic search in ChromaDB
4. **AI Generation:** Construct optimized prompt with context
5. **Post-Processing:** Format and quality checks
6. **User Review:** Edit and finalize proposal

**Reference:** [docs/diagrams/workflow-diagram.md](diagrams/workflow-diagram.md#L76-L86)

---

## Alternative Approach: Mock Datasets (Recommended for Phase 1)

> **📖 Complete Implementation Guide:** See [HUGGINGFACE_INTEGRATION.md](HUGGINGFACE_INTEGRATION.md) for detailed code and step-by-step instructions based on a proven implementation pattern from [Claude AI analysis](https://claude.ai/share/0533106b-9011-4a63-a05c-9203565f829b).

### Why Use Mock Datasets First?

**Development Benefits:**
- ✅ **Faster Integration:** Focus on proposal generation without scraping complexity
- ✅ **No Rate Limits:** Test unlimited scenarios without API restrictions
- ✅ **Reproducible Testing:** Consistent data for automated tests
- ✅ **Cost Effective:** No API keys or proxy infrastructure needed
- ✅ **No Legal Risk:** Avoid ToS violations during development

**Strategy:** Build the entire proposal workflow using realistic job data, then swap in real scraping later.

---

### Available Public Datasets

#### 1. HuggingFace Datasets

**Search Strategy:**
```bash
# Direct search URLs
https://huggingface.co/datasets?search=freelance
https://huggingface.co/datasets?search=upwork
https://huggingface.co/datasets?search=job+posting
https://huggingface.co/datasets?search=gig+economy
```

**Recommended Datasets (Verified):**

| Dataset | HuggingFace ID | Description | Best For |
|---------|---------------|-------------|----------|
| **Job Descriptions** | `jacob-hugging-face/job-descriptions` | Title, company, description, requirements | ⭐ **Best Match** - Closest to freelance postings |
| **Data Jobs (2023)** | `lukebarousse/data_jobs` | 30K+ real job postings from Google, rich metadata | Large variety, salary data |
| **IT Job Postings** | `debasmitamukherjee/IT_job_postings` | Tech-focused postings with skills, salary | Tech-specific jobs |
| **LinkedIn Jobs** | `nakamoto-yama/linkedin_job_postings` | LinkedIn-format postings with company info | Professional tone |

**Recommended Loading Order:**
1. **Start with:** `jacob-hugging-face/job-descriptions` - Clean fields, easy mapping
2. **Expand to:** `lukebarousse/data_jobs` - Broader coverage, skills arrays
3. **Optional:** Mix multiple datasets for variety

**Installation:**
```bash
pip install datasets
```

**Loading Example:**
```python
from datasets import load_dataset

# Search and download
dataset = load_dataset("username/dataset-name")
df = dataset['train'].to_pandas()
```

#### 2. Kaggle Datasets

**Direct Links:**
- **Search:** https://www.kaggle.com/search?q=freelance+jobs
- **Search:** https://www.kaggle.com/search?q=upwork
- **Search:** https://www.kaggle.com/datasets?search=job+postings

**Notable Datasets:**
- `freelancer-projects` - ~50K freelance projects with bids
- `upwork-job-postings` - Real Upwork job data
- `tech-job-descriptions` - Software development jobs
- `indeed-job-postings` - Large corpus of job listings

**How to Download:**
1. Create free Kaggle account
2. Accept dataset terms
3. Download CSV via web or API
4. Place in `backend/data/`

**Kaggle API:**
```bash
pip install kaggle
kaggle datasets download -d username/dataset-name
unzip dataset-name.zip -d backend/data/
```

#### 3. GitHub Public Datasets

**Search Terms:**
```
site:github.com "freelance jobs dataset"
site:github.com "upwork dataset" filetype:csv
site:github.com "gig economy data"
```

**What to Look For:**
- Research project data dumps
- Academic study datasets
- Historical scraped data (public domain)
- Usually CSV/JSON format

#### 4. Pre-Made Dataset (Quick Start)

**Use Existing Seed Data:**

Your project already has sample jobs in `database/seed/dev_data.sql`. Expand this:

```bash
# Extract to CSV for dataset loader
cd backend
python -c "
import csv

jobs = [
    {'title': 'Build a SaaS Dashboard', 'description': 'Need Next.js + PostgreSQL...', 'budget': '5000', 'skills': 'Next.js,React,TypeScript,PostgreSQL'},
    {'title': 'Python FastAPI Backend', 'description': 'RAG + OpenAI integration...', 'budget': '8000', 'skills': 'Python,FastAPI,OpenAI,ChromaDB'},
    # Add 50-100 more...
]

with open('data/jobs_sample.csv', 'w') as f:
    writer = csv.DictWriter(f, fieldnames=jobs[0].keys())
    writer.writeheader()
    writer.writerows(jobs)
"
```

Or use ChatGPT to generate 100 realistic job postings in CSV format!

#### 5. Academic Research Datasets

**Sources:**
- **Papers With Code:** https://paperswithcode.com/datasets
- **Data.gov:** https://data.gov (search "employment", "gig economy")
- **Google Dataset Search:** https://datasetsearch.research.google.com/

**Search Terms:**
- "online labor market dataset"
- "freelance platform research data"
- "gig economy analysis"

**Example Papers:**
- "Online Labor Markets: A Survey" - often includes dataset links
- Research on Upwork/Fiverr/Freelancer platforms

---

### Implementation: Mock Dataset Integration

#### Phase 0: Dataset Setup (Week 1)

**Step 1: Download and Prepare Dataset**

Create a dataset loader service:

**File:** `backend/app/services/dataset_loader.py`

```python
import pandas as pd
import json
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, timedelta
import random

class DatasetLoader:
    """Load and normalize mock job datasets."""
    
    def __init__(self, dataset_path: str = "backend/data/jobs_dataset.csv"):
        self.dataset_path = Path(dataset_path)
        self.df = None
    
    def load_csv(self) -> None:
        """Load jobs from CSV file."""
        self.df = pd.read_csv(self.dataset_path)
        print(f"Loaded {len(self.df)} jobs from {self.dataset_path}")
    
    def load_huggingface(self, dataset_name: str = "freelance-jobs") -> None:
        """Load jobs from HuggingFace dataset."""
        from datasets import load_dataset
        
        dataset = load_dataset(dataset_name)
        self.df = dataset['train'].to_pandas()
        print(f"Loaded {len(self.df)} jobs from HuggingFace")
    
    def normalize_job(self, row: pd.Series) -> Dict:
        """
        Convert dataset row to standardized job format.
        
        Handles various input formats and maps to internal schema.
        """
        # Extract and normalize fields
        title = self._get_field(row, ['title', 'job_title', 'name'])
        description = self._get_field(row, ['description', 'job_description', 'details'])
        
        # Parse budget (handle various formats)
        budget_raw = self._get_field(row, ['budget', 'price', 'amount'])
        budget_min, budget_max, budget_type = self._parse_budget(budget_raw)
        
        # Extract skills/technologies
        skills = self._get_field(row, ['skills', 'technologies', 'required_skills'])
        if isinstance(skills, str):
            skills = [s.strip() for s in skills.split(',')]
        
        # Generate realistic metadata
        return {
            'title': title,
            'description': description,
            'budget_min': budget_min,
            'budget_max': budget_max,
            'budget_type': budget_type,
            'required_skills': skills or [],
            'timeline': self._get_field(row, ['timeline', 'duration', 'deadline']),
            'client_name': self._generate_client_name(),
            'client_rating': round(random.uniform(4.0, 5.0), 1),
            'posted_at': self._generate_posted_date(),
            'platform': self._get_field(row, ['platform', 'source'], default='upwork'),
            'external_url': self._generate_url(title),
            'status': 'new'
        }
    
    def _get_field(self, row: pd.Series, field_names: List[str], default: str = '') -> str:
        """Try multiple field names, return first non-null value."""
        for field in field_names:
            if field in row and pd.notna(row[field]):
                return str(row[field])
        return default
    
    def _parse_budget(self, budget_raw: str) -> tuple:
        """Parse budget string into (min, max, type)."""
        if not budget_raw or pd.isna(budget_raw):
            return None, None, 'fixed'
        
        budget_str = str(budget_raw).lower()
        
        # Extract numbers
        import re
        numbers = re.findall(r'\d+[\d,]*\.?\d*', budget_str)
        
        if not numbers:
            return None, None, 'fixed'
        
        # Remove commas and convert to float
        amounts = [float(n.replace(',', '')) for n in numbers]
        
        # Determine type
        budget_type = 'hourly' if 'hour' in budget_str or '/hr' in budget_str else 'fixed'
        
        if len(amounts) == 1:
            return amounts[0], amounts[0], budget_type
        else:
            return min(amounts), max(amounts), budget_type
    
    def _generate_client_name(self) -> str:
        """Generate realistic client name."""
        companies = ['TechCorp', 'StartupXYZ', 'Global Solutions', 'Digital Agency', 
                     'Innovation Labs', 'Cloud Systems', 'Data Insights', 'Web Ventures']
        return random.choice(companies)
    
    def _generate_posted_date(self) -> str:
        """Generate recent posted date."""
        days_ago = random.randint(0, 30)
        posted_date = datetime.now() - timedelta(days=days_ago)
        return posted_date.isoformat()
    
    def _generate_url(self, title: str) -> str:
        """Generate mock URL."""
        slug = title.lower().replace(' ', '-')[:50]
        return f"https://www.upwork.com/jobs/{slug}"
    
    def get_jobs_batch(self, limit: int = 20, platform: Optional[str] = None) -> List[Dict]:
        """
        Get a batch of normalized jobs.
        
        Args:
            limit: Max number of jobs to return
            platform: Filter by platform (upwork, freelancer, etc.)
        
        Returns:
            List of normalized job dictionaries
        """
        if self.df is None:
            raise ValueError("Dataset not loaded. Call load_csv() or load_huggingface() first.")
        
        # Filter if needed
        df_filtered = self.df
        if platform:
            if 'platform' in self.df.columns:
                df_filtered = self.df[self.df['platform'] == platform]
        
        # Sample and normalize
        sample = df_filtered.head(limit)
        jobs = [self.normalize_job(row) for _, row in sample.iterrows()]
        
        return jobs
    
    def search_jobs(self, keywords: List[str], limit: int = 20) -> List[Dict]:
        """
        Search jobs by keywords in title/description.
        
        Args:
            keywords: List of search terms
            limit: Max results
        
        Returns:
            Matching jobs
        """
        if self.df is None:
            raise ValueError("Dataset not loaded")
        
        # Build search pattern
        pattern = '|'.join(keywords)
        
        # Search in title and description columns
        title_col = self._find_column(['title', 'job_title', 'name'])
        desc_col = self._find_column(['description', 'job_description', 'details'])
        
        mask = (
            self.df[title_col].str.contains(pattern, case=False, na=False) |
            self.df[desc_col].str.contains(pattern, case=False, na=False)
        )
        
        matches = self.df[mask].head(limit)
        return [self.normalize_job(row) for _, row in matches.iterrows()]
    
    def _find_column(self, candidates: List[str]) -> str:
        """Find first existing column from candidates."""
        for col in candidates:
            if col in self.df.columns:
                return col
        return self.df.columns[0]  # Fallback to first column
```

**Step 2: Create Data Directory and Sample Dataset**

```bash
# Create data directory
mkdir -p backend/data

# Download sample dataset (example using curl)
curl -o backend/data/jobs_dataset.csv \
  "https://huggingface.co/datasets/YOUR_DATASET/resolve/main/data.csv"

# Or create a minimal sample for testing
cat > backend/data/jobs_sample.csv << 'EOF'
title,description,budget,skills,platform
"Build a Next.js SaaS Dashboard","We need an experienced developer to build a modern SaaS dashboard using Next.js 15, React 19, and PostgreSQL. The dashboard should include user authentication, data visualization, and subscription management.","$5000","Next.js,React,TypeScript,PostgreSQL,TailwindCSS",upwork
"Python FastAPI Backend","Looking for a Python expert to build a FastAPI backend with OpenAI integration. Must have experience with RAG, vector databases, and asynchronous programming.","$8000","Python,FastAPI,OpenAI,ChromaDB,PostgreSQL",freelancer
"E-commerce Website Redesign","Redesign our Shopify storefront with custom React components. Need someone with strong UI/UX skills.","$15000","React,Shopify,JavaScript,CSS",upwork
EOF
```

**Step 3: Create Mock Scraper Service**

**File:** `backend/app/services/mock_scraper_service.py`

```python
from typing import List, Optional
from .dataset_loader import DatasetLoader
from ..models.scraper import ScrapedJob
from datetime import datetime

class MockScraperService:
    """
    Mock scraper that returns jobs from dataset instead of live scraping.
    
    API-compatible with real ScraperService for easy swapping.
    """
    
    def __init__(self, dataset_path: str = "backend/data/jobs_dataset.csv"):
        self.loader = DatasetLoader(dataset_path)
        self.loader.load_csv()
    
    async def initialize(self):
        """Mock initialization (no-op for dataset loader)."""
        pass
    
    async def cleanup(self):
        """Mock cleanup (no-op for dataset loader)."""
        pass
    
    async def scrape_jobs(
        self,
        platform: str,
        search_terms: List[str],
        max_results: int
    ) -> List[dict]:
        """
        'Scrape' jobs from dataset.
        
        Args:
            platform: Platform filter (upwork, freelancer)
            search_terms: Keywords to search for
            max_results: Max jobs to return
        
        Returns:
            List of mock job dictionaries
        """
        # If search terms provided, do keyword search
        if search_terms:
            jobs = self.loader.search_jobs(search_terms, limit=max_results)
        else:
            jobs = self.loader.get_jobs_batch(limit=max_results, platform=platform)
        
        # Filter by platform if specified
        if platform:
            jobs = [j for j in jobs if j['platform'].lower() == platform.lower()]
        
        return jobs[:max_results]
```

**Step 4: Create API Router with Dataset Support**

**File:** `backend/app/routers/projects.py`

```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List, Optional
from ..models.scraper import ScrapingJobCreate, ScrapingJob
from ..services.mock_scraper_service import MockScraperService
from ..core.auth import get_current_user_id
from ..core.database import get_db
import uuid
from datetime import datetime

router = APIRouter(prefix="/api/projects", tags=["projects"])

# Use mock scraper for now - swap with real ScraperService later
scraper = MockScraperService()

@router.post("/discover", response_model=dict)
async def discover_jobs(
    platform: str,
    search_terms: List[str],
    max_results: int = 20,
    user_id: str = Depends(get_current_user_id),
):
    """
    Discover jobs from dataset (mock scraping).
    
    Returns immediately with jobs from local dataset.
    Later: will trigger async scraping job.
    """
    try:
        jobs = await scraper.scrape_jobs(platform, search_terms, max_results)
        
        # TODO: Store jobs in database (projects table)
        # For now, just return them
        
        return {
            "success": True,
            "count": len(jobs),
            "jobs": jobs,
            "source": "mock_dataset"  # Indicator for development
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list", response_model=List[dict])
async def list_projects(
    platform: Optional[str] = None,
    limit: int = 50,
    user_id: str = Depends(get_current_user_id),
):
    """List all discovered projects."""
    # TODO: Query from database
    # For now, return sample from dataset
    jobs = await scraper.scrape_jobs(platform or 'upwork', [], limit)
    return jobs
```

**Step 5: Install Dataset Dependencies**

```bash
# Add to requirements.txt
pandas>=2.0.0
datasets>=2.14.0  # For HuggingFace datasets
```

**Step 6: Seed Database with Dataset Jobs**

Create a management script:

**File:** `backend/scripts/seed_jobs_from_dataset.py`

```python
#!/usr/bin/env python3
"""
Seed database with jobs from dataset.

Usage:
    python -m backend.scripts.seed_jobs_from_dataset --count 100
"""

import asyncio
import asyncpg
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).parent.parent))

from app.services.dataset_loader import DatasetLoader
from app.config import settings

async def seed_jobs(connection_string: str, count: int = 100):
    """Seed database with jobs from dataset."""
    
    # Load dataset
    loader = DatasetLoader()
    loader.load_csv()
    
    # Get jobs
    jobs = loader.get_jobs_batch(limit=count)
    
    # Connect to database
    conn = await asyncpg.connect(connection_string)
    
    try:
        user_id = '00000000-0000-0000-0000-000000000001'  # Test user
        
        for job in jobs:
            await conn.execute("""
                INSERT INTO projects (
                    user_id, title, description, budget, budget_type,
                    technologies, source_platform, status, created_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
            """,
                user_id,
                job['title'],
                job['description'],
                job['budget_min'],
                job['budget_type'],
                job['required_skills'],
                job['platform'],
                job['status']
            )
        
        print(f"✅ Seeded {len(jobs)} jobs successfully")
    
    finally:
        await conn.close()

if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument('--count', type=int, default=100)
    args = parser.parse_args()
    
    asyncio.run(seed_jobs(settings.database_url, args.count))
```

---

### Migration Path: Dataset → Real Scraping

**Phase 0 (Week 1-2):** Mock Dataset
- ✅ Use `MockScraperService` with dataset
- ✅ Build proposal generation workflow
- ✅ Test end-to-end without scraping complexity

**Phase 1 (Week 3-4):** Add Real Scraping
- 🔄 Implement `RealScraperService` 
- 🔄 Keep same API interface
- 🔄 Feature flag to toggle between mock/real

**Phase 2 (Week 5+):** Production
- 🔄 Switch to real scraping by default
- 🔄 Keep mock dataset for testing
- 🔄 Use dataset as fallback if scraping fails

**Implementation:**

```python
# config.py
USE_MOCK_SCRAPER = os.getenv("USE_MOCK_SCRAPER", "true").lower() == "true"

# routers/projects.py
from app.config import settings

if settings.USE_MOCK_SCRAPER:
    from app.services.mock_scraper_service import MockScraperService as ScraperService
else:
    from app.services.scraper_service import ScraperService

scraper = ScraperService()
```

---

### Recommended Datasets

**Best Options for Freelance Job Data:**

1. **HuggingFace Hub:**
   - Search: "freelance", "upwork", "job posting"
   - Filter: English, structured data, recent
   - Preferred format: CSV or JSON with title + description

2. **Kaggle:**
   - `freelancer-projects` - 50K+ projects
   - `upwork-job-postings` - Real job data
   - `tech-job-descriptions` - Technical roles

3. **Custom Dataset:**
   - Use existing `database/seed/dev_data.sql` as template
   - Expand with ChatGPT-generated realistic jobs
   - Target your specific tech stack

**Dataset Quality Checklist:**
- ✅ Includes job title and description
- ✅ Has budget/rate information
- ✅ Lists required skills/technologies
- ✅ At least 1000+ samples for variety
- ✅ Recent data (last 2-3 years)
- ✅ English language
- ✅ Structured format (CSV/JSON)

---

### Complete Example: HuggingFace Dataset Integration

**Step-by-Step Guide:**

**1. Find and Download Dataset:**
```bash
cd backend

# Install dependencies
pip install datasets pandas

# Create data directory
mkdir -p data

# Test dataset search
python << EOF
from datasets import load_dataset_builder, list_datasets

# Search for relevant datasets
results = [d for d in list_datasets() if 'job' in d.lower() or 'freelance' in d.lower()]
print(f"Found {len(results)} relevant datasets")
for ds in results[:10]:
    print(f"  - {ds}")
EOF
```

**2. Download and Explore:**
```python
from datasets import load_dataset
import pandas as pd

# Example: Load a job dataset (replace with actual dataset name)
dataset = load_dataset("your-chosen-dataset")

# Convert to pandas
df = dataset['train'].to_pandas()

# Explore structure
print(df.columns)
print(df.head())
print(f"Total jobs: {len(df)}")

# Save as CSV for dataset loader
df.to_csv('backend/data/jobs_dataset.csv', index=False)
```

**3. Create Dataset Loader (Already Provided Above):**

Copy the `DatasetLoader` class from the implementation section into:
```
backend/app/services/dataset_loader.py
```

**4. Test Loading:**
```python
# backend/test_dataset.py
from app.services.dataset_loader import DatasetLoader

loader = DatasetLoader('backend/data/jobs_dataset.csv')
loader.load_csv()

# Get sample jobs
jobs = loader.get_jobs_batch(limit=5)
for job in jobs:
    print(f"\n{job['title']}")
    print(f"Budget: ${job['budget_min']}-${job['budget_max']} ({job['budget_type']})")
    print(f"Skills: {', '.join(job['required_skills'][:5])}")

# Test search
search_results = loader.search_jobs(['python', 'fastapi'], limit=3)
print(f"\nFound {len(search_results)} jobs matching 'python' or 'fastapi'")
```

**5. Integrate with API:**

The `MockScraperService` (provided above) will use this loader. Just add the router:

```python
# backend/app/main.py
from app.routers import projects

app.include_router(projects.router)
```

**6. Test API Endpoint:**
```bash
# Start backend
cd backend
uvicorn app.main:app --reload

# Test in another terminal
curl -X POST "http://localhost:8000/api/projects/discover" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "platform": "upwork",
    "search_terms": ["python", "fastapi"],
    "max_results": 10
  }'
```

**7. Expected Response:**
```json
{
  "success": true,
  "count": 10,
  "source": "mock_dataset",
  "jobs": [
    {
      "title": "Python FastAPI Backend Developer",
      "description": "Looking for experienced developer...",
      "budget_min": 5000,
      "budget_max": 8000,
      "budget_type": "fixed",
      "required_skills": ["Python", "FastAPI", "PostgreSQL"],
      "platform": "upwork",
      "posted_at": "2026-02-15T10:30:00",
      "client_name": "TechCorp",
      "client_rating": 4.8
    }
  ]
}
```

**8. Build Frontend:**

Now you can display these jobs in your Projects Dashboard and connect to the proposal generation workflow!

---

### Testing Strategy with Mock Data

**Unit Tests:**
```python
@pytest.mark.asyncio
async def test_mock_scraper():
    scraper = MockScraperService("backend/data/test_jobs.csv")
    await scraper.initialize()
    
    jobs = await scraper.scrape_jobs(
        platform="upwork",
        search_terms=["python", "fastapi"],
        max_results=5
    )
    
    assert len(jobs) <= 5
    assert all('python' in j['title'].lower() or 
               'python' in j['description'].lower() 
               for j in jobs)
```

**Integration Tests:**
```python
def test_proposal_generation_with_mock_jobs():
    """Test full workflow with dataset jobs."""
    # 1. Load mock jobs
    # 2. Select job
    # 3. Generate proposal
    # 4. Verify output quality
    pass
```

---

## Implementation Guide

### Phase 1: Core Scraper Service (Week 1-2)

**Note:** Consider starting with Mock Dataset approach above first, then implement real scraping in Phase 2-3.

#### Step 1: Create Scraper Models
**File:** `backend/app/models/scraper.py`

```python
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime

class ScrapingJobCreate(BaseModel):
    platform: str = Field(..., description="Platform: upwork, freelancer")
    search_terms: List[str] = Field(..., description="Keywords to search")
    max_results: int = Field(20, ge=1, le=100)

class ScrapingJob(BaseModel):
    id: str
    user_id: str
    platform: str
    search_terms: List[str]
    max_results: int
    status: str  # pending, running, completed, failed
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    jobs_found: int
    jobs_new: int
    jobs_duplicated: int
    error_message: Optional[str]
    created_at: datetime

class ScrapedJob(BaseModel):
    title: str
    description: str
    budget_min: Optional[float]
    budget_max: Optional[float]
    budget_type: str  # fixed, hourly
    timeline: Optional[str]
    required_skills: List[str]
    client_name: str
    client_rating: Optional[float]
    posted_at: datetime
    platform: str
    external_url: str
```

#### Step 2: Create Scraper Service
**File:** `backend/app/services/scraper_service.py`

```python
from typing import List, Optional
from playwright.async_api import async_playwright
from bs4 import BeautifulSoup
import asyncio

class ScraperService:
    """Base scraper service with platform-specific implementations."""
    
    def __init__(self):
        self.playwright = None
        self.browser = None
    
    async def initialize(self):
        """Initialize Playwright browser."""
        self.playwright = await async_playwright().start()
        self.browser = await self.playwright.chromium.launch(
            headless=True,
            args=['--no-sandbox']
        )
    
    async def cleanup(self):
        """Clean up browser resources."""
        if self.browser:
            await self.browser.close()
        if self.playwright:
            await self.playwright.stop()
    
    async def scrape_jobs(
        self, 
        platform: str, 
        search_terms: List[str], 
        max_results: int
    ) -> List[dict]:
        """
        Main scraping method - delegates to platform-specific scrapers.
        """
        if platform == "upwork":
            return await self._scrape_upwork(search_terms, max_results)
        elif platform == "freelancer":
            return await self._scrape_freelancer(search_terms, max_results)
        else:
            raise ValueError(f"Unsupported platform: {platform}")
    
    async def _scrape_upwork(self, search_terms: List[str], max_results: int):
        """Upwork scraper implementation."""
        # TODO: Implement Upwork scraping logic
        # - Navigate to search page
        # - Apply filters
        # - Extract job listings
        # - Handle pagination
        pass
    
    async def _scrape_freelancer(self, search_terms: List[str], max_results: int):
        """Freelancer scraper implementation."""
        # TODO: Implement Freelancer scraping logic
        pass
```

#### Step 3: Create API Router
**File:** `backend/app/routers/scrapers.py`

```python
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks
from typing import List
from ..models.scraper import ScrapingJobCreate, ScrapingJob
from ..services.scraper_service import ScraperService
from ..core.auth import get_current_user_id

router = APIRouter(prefix="/api/scrapers", tags=["scrapers"])

@router.post("/start", response_model=ScrapingJob)
async def start_scraping_job(
    job: ScrapingJobCreate,
    background_tasks: BackgroundTasks,
    user_id: str = Depends(get_current_user_id),
):
    """Start a new scraping job in the background."""
    # Create job record
    # Add to background tasks
    # Return job ID
    pass

@router.get("/jobs", response_model=List[ScrapingJob])
async def list_scraping_jobs(
    user_id: str = Depends(get_current_user_id),
):
    """List all scraping jobs for the current user."""
    pass

@router.get("/jobs/{job_id}", response_model=ScrapingJob)
async def get_scraping_job(
    job_id: str,
    user_id: str = Depends(get_current_user_id),
):
    """Get details of a specific scraping job."""
    pass
```

#### Step 4: Register Router
**File:** `backend/app/main.py`

```python
from .routers import scrapers

app.include_router(scrapers.router)
```

### Phase 2: Platform-Specific Scrapers (Week 2-3)

#### Upwork Scraper
- Use Playwright for dynamic content
- Implement proxy rotation for stealth
- Handle anti-bot detection (cookies, headers, timing)
- Extract job cards from search results
- Follow pagination links

#### Freelancer Scraper
- Prefer RSS feeds (public, stable)
- Fall back to API if credentials available
- Parse XML/JSON responses
- Map to internal schema

### Phase 3: Background Workers & Scheduling (Week 3-4)

- Implement APScheduler for periodic scraping
- Add job queue with priority
- Implement retry logic with exponential backoff
- Add monitoring and alerting

### Phase 4: Frontend Integration (Week 4)

- Projects Dashboard UI
- Real-time status updates via WebSocket
- Search term management
- Platform configuration

---

## API Authentication Options

### Option A: Platform APIs (Recommended)

**Advantages:**
- Stable, documented endpoints
- Lower risk of breaking changes
- Respect rate limits programmatically
- Terms of Service compliant

**Setup:**
1. Create developer apps on each platform
2. Implement OAuth flow for user credentials
3. Store access/refresh tokens in `platform_credentials`
4. Handle token refresh automatically

**Upwork API:** https://developers.upwork.com/  
**Freelancer API:** https://developers.freelancer.com/

### Option B: Web Scraping (Higher Risk)

**Advantages:**
- No API key requirements
- Access to all publicly visible data
- No rate limit restrictions (careful!)

**Disadvantages:**
- Fragile (UI changes break scrapers)
- Anti-bot detection challenges
- Potential ToS violations
- Higher maintenance burden

**Best Practices:**
- Respect robots.txt
- Implement rate limiting
- Rotate user agents and proxies
- Use headless browser for dynamic content
- Cache results to minimize requests

---

## Security Considerations

### 1. Credential Storage
**Current State:** Platform credentials stored in **plaintext** (not secure!)

**Production Requirements:**
```python
# Encrypt credentials before storage
from cryptography.fernet import Fernet

# Store encryption key in environment
ENCRYPTION_KEY = os.getenv("CREDENTIAL_ENCRYPTION_KEY")

def encrypt_credential(plaintext: str) -> str:
    f = Fernet(ENCRYPTION_KEY)
    return f.encrypt(plaintext.encode()).decode()

def decrypt_credential(encrypted: str) -> str:
    f = Fernet(ENCRYPTION_KEY)
    return f.decrypt(encrypted.encode()).decode()
```

### 2. Rate Limiting
Implement per-user and per-platform rate limits:

```python
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@router.post("/start")
@limiter.limit("5/minute")  # Max 5 scraping jobs per minute
async def start_scraping_job(...):
    pass
```

### 3. Input Validation
Sanitize search terms to prevent injection attacks:

```python
from html import escape

def sanitize_search_term(term: str) -> str:
    # Remove HTML tags
    # Escape special characters
    # Limit length
    return escape(term.strip()[:100])
```

---

## Testing Strategy

### Unit Tests
**File:** `backend/tests/test_scraper_service.py`

```python
import pytest
from app.services.scraper_service import ScraperService

@pytest.mark.asyncio
async def test_scrape_jobs_upwork():
    scraper = ScraperService()
    await scraper.initialize()
    
    jobs = await scraper.scrape_jobs(
        platform="upwork",
        search_terms=["python", "fastapi"],
        max_results=5
    )
    
    assert len(jobs) <= 5
    assert all(job["platform"] == "upwork" for job in jobs)
    
    await scraper.cleanup()
```

### Integration Tests
Test end-to-end scraping workflow:
- Mock platform responses
- Verify database updates
- Check status transitions

### Manual Testing
1. Start scraping job via API
2. Monitor status in real-time
3. Verify results in Projects Dashboard
4. Check error handling for invalid credentials

---

## Performance Considerations

### Optimization Strategies

1. **Concurrent Scraping:** Use asyncio to scrape multiple pages simultaneously
2. **Caching:** Cache search results for 5-10 minutes
3. **Incremental Updates:** Only scrape new/updated jobs
4. **Database Indexing:** Index frequently queried fields

### Monitoring Metrics

Track these metrics in production:
- Scraping job success rate
- Average execution time per platform
- Jobs found vs. jobs new (duplication rate)
- API error rates
- Rate limit violations

---

## Documentation References

### Implementation Guides
- [Implementation Strategy](3-guides/IMPLEMENTATION_STRATEGY.md#L40-L49) - Phase 2 scraping details
- [Architecture Diagram](diagrams/architecture-diagram.md#L34) - System component overview
- [Workflow Diagram](diagrams/workflow-diagram.md#L76-L86) - End-to-end flow

### Planning Documents
- [Production SaaS Plan](auto-bidder_production_saas_plan.md) - API requirements and setup
- [Progress Tracking](4-status/PROGRESS.md#L92) - Current implementation status
- [Quick Start Guide](QUICK_START.md) - Complete setup and user workflow guide

### Code References
- Database Schema: [database/migrations/003_biddinghub_merge.sql](../database/migrations/003_biddinghub_merge.sql#L92-L143)
- Error Classes: [backend/app/core/errors.py](../backend/app/core/errors.py#L44-L45)
- Dependencies: [backend/requirements.txt](../backend/requirements.txt#L34-L37)
- Main App: [backend/app/main.py](../backend/app/main.py#L35)

---

## Next Steps

### 🎯 Recommended Approach: Mock Dataset First

#### Week 1: Dataset Integration (PRIORITY)

- [ ] Search HuggingFace/Kaggle for freelance job datasets
- [ ] Download and prepare dataset (CSV/JSON)
- [ ] Create `backend/data/` directory
- [ ] Install dependencies: `pandas`, `datasets`
- [ ] Create `DatasetLoader` class in `services/dataset_loader.py`
- [ ] Create `MockScraperService` in `services/mock_scraper_service.py`
- [ ] Create API router `routers/projects.py`
- [ ] Test dataset loading and normalization

#### Week 2: Integration & Testing

- [ ] Seed database with mock jobs (100+ samples)
- [ ] Build Projects Dashboard UI for job listing
- [ ] Test job selection → proposal generation workflow
- [ ] Verify RAG retrieval with job descriptions
- [ ] Document dataset sources and format
- [ ] Create feature flag `USE_MOCK_SCRAPER=true`

#### Week 3-4: Optional - Add Real Scraping (Phase 3)

- [ ] Re-add Crawlee to requirements.txt
- [ ] Install Playwright browsers: `playwright install chromium`
- [ ] Create `RealScraperService` (same interface as mock)
- [ ] Implement Upwork scraper
- [ ] Implement Freelancer scraper
- [ ] Add feature toggle between mock/real scrapers
- [ ] Keep mock dataset for testing/fallback

### Phase 3 Deliverables (Future)

- [ ] Real web scraper implementation (optional)
- [ ] Background job worker for async scraping
- [ ] Real-time status updates via WebSocket
- [ ] Platform API integrations (OAuth)
- [ ] Error handling and retry logic
- [ ] Proxy rotation and anti-bot measures

### Future Enhancements

- [ ] Add more platforms (Fiverr, Toptal, etc.)
- [ ] Implement AI-powered job matching
- [ ] Smart notifications based on user preferences
- [ ] Analytics dashboard for scraping performance
- [ ] Export scraped jobs to CSV/JSON

---

## Troubleshooting

### Common Issues

**Issue:** Playwright browser fails to launch  
**Solution:** Run `playwright install-deps` to install system dependencies

**Issue:** Anti-bot detection blocking requests  
**Solution:** 
- Use residential proxies
- Implement random delays between requests
- Rotate user agents
- Clear cookies periodically

**Issue:** Dependency conflicts with Crawlee  
**Solution:** 
- Use virtual environment
- Pin specific versions
- Consider using Docker container

**Issue:** Rate limits exceeded  
**Solution:**
- Implement exponential backoff
- Add delays between requests
- Use platform API instead of scraping

---

## Conclusion

The scraping functionality is well-architected but awaiting implementation. **The recommended approach is to start with mock datasets** from HuggingFace or Kaggle to:

1. **Accelerate Development:** Build and test the proposal generation workflow without scraping complexity
2. **Reduce Risk:** No ToS violations, rate limits, or anti-bot challenges during development
3. **Enable Testing:** Reproducible test data for automated testing
4. **Defer Complexity:** Save real web scraping for Phase 3 after core features proven

The database schema, error handling, and dependencies are ready. The `MockScraperService` provides the same API interface as the real scraper, making it trivial to swap implementations later with a feature flag.

### Development Timeline

**Weeks 1-2:** Mock dataset integration → fully functional proposal generation  
**Weeks 3-4:** Optional real scraping implementation (only if needed)  
**Week 5+:** Production deployment with feature toggle

### Key Benefits

✅ **Faster time to value** - Test full workflow in days, not weeks  
✅ **Lower infrastructure costs** - No proxies or API keys needed initially  
✅ **Better testing** - Consistent, reproducible test data  
✅ **Reduced risk** - No legal or technical scraping challenges  
✅ **Easy migration** - Same interface, feature flag toggle

**Priority:** High (Start with Mock Dataset - Week 1)  
**Estimated Effort:** 1-2 weeks (mock), 3-4 weeks (real scraping if needed)  
**Dependencies:** pandas, HuggingFace datasets library

For questions or updates, refer to the [Progress Tracking](4-status/PROGRESS.md) document.

---

## Quick Start: Using Mock Datasets

**1. Find a Dataset:**
```bash
# Search HuggingFace
https://huggingface.co/datasets?search=freelance

# Or use Kaggle
https://www.kaggle.com/search?q=upwork+jobs
```

**2. Install Dependencies:**
```bash
cd backend
pip install pandas datasets
```

**3. Create Dataset Loader:**
```bash
# Copy code from "Implementation: Mock Dataset Integration" section above
# Create backend/app/services/dataset_loader.py
# Create backend/app/services/mock_scraper_service.py
```

**4. Test It:**
```python
from app.services.mock_scraper_service import MockScraperService

scraper = MockScraperService()
jobs = await scraper.scrape_jobs("upwork", ["python", "fastapi"], 10)
print(f"Found {len(jobs)} jobs")
```

**5. Build Your Workflow:**
- Load mock jobs → Display in UI → Select job → Generate proposal → Success! 🎉
