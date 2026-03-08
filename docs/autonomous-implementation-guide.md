# Autonomous System Implementation Guide 🛠️

**Companion to**: `autonomous-automation-strategy.md`  
**Focus**: Technical implementation details, code examples, and patterns  
**Audience**: Backend developers implementing the multi-agent system

---

## 🏗️ Architecture Setup

### 1. Install Dependencies

```bash
# Core agent frameworks
pip install langgraph langchain langchain-openai langchain-anthropic
pip install crewai crewai-tools

# Advanced RAG
pip install neo4j  # For GraphRAG
pip install cohere  # For reranking
pip install sentence-transformers  # For embeddings

# Web automation
pip install browser-use playwright
pip install firecrawl-py

# Task queue
pip install celery redis

# Monitoring
pip install langsmith sentry-sdk

# Graph database (choose one)
pip install neo4j  # Recommended for GraphRAG
# OR: pip install psycopg2-binary  # PostgreSQL + Apache AGE extension
```

### 2. Project Structure

Create new directories in `backend/app/`:

```
backend/app/
├── agents/                    # NEW: Agent definitions
│   ├── __init__.py
│   ├── base.py               # Base agent class
│   ├── discovery.py          # Discovery agent
│   ├── qualification.py      # Qualification agent
│   ├── generation.py         # Generation agent (CrewAI crew)
│   ├── submission.py         # Submission agent
│   ├── learning.py           # Learning agent
│   └── orchestrator.py       # LangGraph supervisor
├── workflows/                 # NEW: LangGraph workflows
│   ├── __init__.py
│   └── bidding_workflow.py   # Main autonomous workflow
├── tasks/                     # NEW: Celery tasks
│   ├── __init__.py
│   ├── discovery_tasks.py
│   └── learning_tasks.py
├── rag/                       # NEW: Advanced RAG system
│   ├── __init__.py
│   ├── graph_rag.py          # GraphRAG implementation
│   ├── hybrid_search.py      # Hybrid retrieval
│   └── reranker.py           # Reranking service
└── integrations/              # NEW: Platform integrations
    ├── __init__.py
    ├── upwork.py
    ├── freelancer.py
    └── browser_automation.py
```

---

## 🤖 Agent Implementation Examples

### Base Agent Class

```python
# backend/app/agents/base.py

from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
from uuid import UUID
import logging
from langchain.agents import AgentExecutor, create_tool_calling_agent
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate
from app.config import settings

logger = logging.getLogger(__name__)


class BaseAgent(ABC):
    """
    Base class for all autonomous agents.
    Provides common functionality for LLM interaction, tool usage, and logging.
    """
    
    def __init__(
        self,
        name: str,
        role: str,
        goal: str,
        backstory: str,
        tools: list = None,
        llm_model: str = "gpt-4-turbo",
        temperature: float = 0.7
    ):
        self.name = name
        self.role = role
        self.goal = goal
        self.backstory = backstory
        self.tools = tools or []
        
        # Initialize LLM based on settings
        self.llm = self._initialize_llm(llm_model, temperature)
        
        # Create agent executor
        self.agent_executor = self._create_agent_executor()
        
        logger.info(f"Initialized agent: {self.name}")
    
    def _initialize_llm(self, model: str, temperature: float):
        """Initialize LLM based on configuration."""
        if model.startswith("gpt"):
            return ChatOpenAI(
                api_key=settings.openai_api_key,
                model=model,
                temperature=temperature
            )
        elif model.startswith("claude"):
            from langchain_anthropic import ChatAnthropic
            return ChatAnthropic(
                api_key=settings.anthropic_api_key,
                model=model,
                temperature=temperature
            )
        else:
            raise ValueError(f"Unsupported model: {model}")
    
    def _create_agent_executor(self) -> Optional[AgentExecutor]:
        """Create LangChain agent executor with tools."""
        if not self.tools:
            return None
        
        prompt = ChatPromptTemplate.from_messages([
            ("system", f"""You are {self.role}.
            
Goal: {self.goal}

Background: {self.backstory}

You have access to tools to accomplish your task. Use them wisely."""),
            ("user", "{input}"),
            ("assistant", "{agent_scratchpad}")
        ])
        
        agent = create_tool_calling_agent(self.llm, self.tools, prompt)
        return AgentExecutor(agent=agent, tools=self.tools, verbose=True)
    
    @abstractmethod
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute the agent's primary task.
        Must be implemented by subclasses.
        """
        pass
    
    async def invoke(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Public method to invoke the agent.
        Includes error handling and logging.
        """
        try:
            logger.info(f"Agent {self.name} executing with input: {input_data}")
            result = await self.execute(input_data)
            logger.info(f"Agent {self.name} completed successfully")
            return result
        except Exception as e:
            logger.error(f"Agent {self.name} failed: {e}", exc_info=True)
            raise
```

---

### Discovery Agent

```python
# backend/app/agents/discovery.py

from typing import List, Dict, Any
from datetime import datetime
import hashlib
from browser_use import BrowserUseTool, BrowserConfig
from app.agents.base import BaseAgent
from app.models.project import Project
from app.core.database import get_db_pool

class DiscoveryAgent(BaseAgent):
    """
    Autonomous agent for discovering job listings across freelance platforms.
    Uses Browser Use framework for autonomous web navigation and scraping.
    """
    
    def __init__(self):
        super().__init__(
            name="DiscoveryAgent",
            role="Job Discovery Specialist",
            goal="Continuously monitor freelance platforms and discover relevant job opportunities",
            backstory="Expert at navigating job boards and extracting structured data from listings",
            llm_model="gpt-4o-mini",  # Cheaper model for web interaction
            temperature=0.3  # Low temp for consistent navigation
        )
        
        # Initialize browser automation tools
        self.browser_config = BrowserConfig(
            headless=True,
            chrome_instance_path=None,  # Auto-detect Chrome
        )
        
        self.platforms = {
            "upwork": self._scrape_upwork,
            "freelancer": self._scrape_freelancer,
        }
    
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Execute job discovery across configured platforms.
        
        Input:
            - platforms: List of platform names (optional, defaults to all)
            - keywords: List of search keywords (from user profile)
            - max_jobs: Maximum jobs to discover per platform
        
        Output:
            - discovered_jobs: List of normalized jobs
            - stats: Discovery statistics
        """
        platforms = input_data.get("platforms", list(self.platforms.keys()))
        keywords = input_data.get("keywords", ["python", "fastapi", "backend"])
        max_jobs = input_data.get("max_jobs", 50)
        
        discovered_jobs = []
        stats = {}
        
        for platform in platforms:
            if platform not in self.platforms:
                continue
            
            scraper = self.platforms[platform]
            jobs = await scraper(keywords, max_jobs)
            
            # Deduplicate and normalize
            normalized_jobs = await self._normalize_and_deduplicate(jobs)
            discovered_jobs.extend(normalized_jobs)
            
            stats[platform] = {
                "raw_count": len(jobs),
                "normalized_count": len(normalized_jobs)
            }
        
        # Save to database
        await self._save_jobs_to_db(discovered_jobs)
        
        return {
            "discovered_jobs": discovered_jobs,
            "stats": stats,
            "timestamp": datetime.utcnow().isoformat()
        }
    
    async def _scrape_upwork(self, keywords: List[str], max_jobs: int) -> List[Dict]:
        """Scrape Upwork using browser automation."""
        from browser_use import Browser, Controller
        
        browser = Browser(config=self.browser_config)
        controller = Controller()
        
        jobs = []
        search_query = " ".join(keywords)
        
        try:
            # Navigate to Upwork search
            task = f"""
            Navigate to Upwork job search and find jobs matching: {search_query}
            
            For each job listing, extract:
            - Job title
            - Client name
            - Description (first 500 chars)
            - Budget or hourly rate
            - Skills required
            - Job posting URL
            - Posted date
            
            Return structured data for up to {max_jobs} jobs.
            """
            
            result = await controller.run(
                task=task,
                llm=self.llm,
                browser=browser
            )
            
            # Parse structured output
            jobs = result.get("extracted_jobs", [])
            
        finally:
            await browser.close()
        
        return jobs
    
    async def _scrape_freelancer(self, keywords: List[str], max_jobs: int) -> List[Dict]:
        """Scrape Freelancer.com using browser automation."""
        # Similar to Upwork scraping
        pass
    
    async def _normalize_and_deduplicate(self, jobs: List[Dict]) -> List[Dict]:
        """
        Normalize job data to internal schema and remove duplicates.
        Uses semantic hashing for deduplication.
        """
        from sentence_transformers import SentenceTransformer
        
        # Load embedding model for deduplication
        model = SentenceTransformer('all-MiniLM-L6-v2')
        
        normalized = []
        seen_embeddings = set()
        
        for job in jobs:
            # Normalize to internal schema
            normalized_job = {
                "external_id": job.get("id", hashlib.md5(job["title"].encode()).hexdigest()),
                "platform": job["platform"],
                "title": job["title"],
                "company": job.get("client_name", "Unknown"),
                "description": job["description"],
                "requirements": job.get("requirements", ""),
                "skills": job.get("skills", []),
                "budget_min": job.get("budget_min"),
                "budget_max": job.get("budget_max"),
                "budget_type": job.get("budget_type", "fixed"),
                "url": job["url"],
                "posted_at": job.get("posted_at", datetime.utcnow()),
                "source": "autonomous_discovery",
                "status": "new",
                "discovered_at": datetime.utcnow()
            }
            
            # Semantic deduplication
            text_for_embedding = f"{job['title']} {job['description'][:200]}"
            embedding = model.encode([text_for_embedding])[0]
            embedding_hash = hashlib.md5(embedding.tobytes()).hexdigest()
            
            if embedding_hash not in seen_embeddings:
                normalized.append(normalized_job)
                seen_embeddings.add(embedding_hash)
        
        return normalized
    
    async def _save_jobs_to_db(self, jobs: List[Dict]):
        """Save discovered jobs to database."""
        if not jobs:
            return
        
        db = await get_db_pool()
        
        for job in jobs:
            # Upsert to avoid duplicates
            await db.execute("""
                INSERT INTO projects (
                    external_id, platform, title, company, description,
                    requirements, skills, budget_min, budget_max, budget_type,
                    url, posted_at, source, status, discovered_at
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                ON CONFLICT (external_id, platform) DO UPDATE SET
                    title = EXCLUDED.title,
                    description = EXCLUDED.description,
                    updated_at = NOW()
            """,
                job["external_id"], job["platform"], job["title"], job["company"],
                job["description"], job["requirements"], job["skills"],
                job["budget_min"], job["budget_max"], job["budget_type"],
                job["url"], job["posted_at"], job["source"], job["status"],
                job["discovered_at"]
            )


# Singleton instance
discovery_agent = DiscoveryAgent()
```

---

### Qualification Agent

```python
# backend/app/agents/qualification.py

from typing import Dict, Any, List
from uuid import UUID
from app.agents.base import BaseAgent
from app.core.database import get_db_pool
import numpy as np

class QualificationAgent(BaseAgent):
    """
    Agent that scores and qualifies job opportunities based on user profile fit.
    Uses multi-dimensional scoring to determine if a job should auto-generate proposal.
    """
    
    def __init__(self):
        super().__init__(
            name="QualificationAgent",
            role="Job Qualification Specialist",
            goal="Assess job opportunities and identify high-probability matches",
            backstory="Expert at matching freelancer skills to client requirements",
            llm_model="gpt-4o-mini",
            temperature=0.2
        )
    
    async def execute(self, input_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Qualify jobs for a specific user.
        
        Input:
            - user_id: UUID of the user
            - job_ids: List of job IDs to qualify (optional, processes all new jobs)
        
        Output:
            - qualified_jobs: List of jobs with scores >= threshold
            - rejected_jobs: List of jobs below threshold
            - stats: Qualification statistics
        """
        user_id = UUID(input_data["user_id"])
        job_ids = input_data.get("job_ids")
        
        # Get user profile
        user_profile = await self._get_user_profile(user_id)
        
        # Get jobs to qualify
        jobs = await self._get_jobs_to_qualify(user_id, job_ids)
        
        qualified_jobs = []
        rejected_jobs = []
        
        for job in jobs:
            score = await self._score_job(job, user_profile)
            
            # Add score to job
            job_with_score = {**job, "qualification_score": score}
            
            # Determine action based on threshold
            threshold = user_profile.get("auto_bid_threshold", 0.70)
            
            if score >= threshold:
                qualified_jobs.append(job_with_score)
                await self._mark_job_qualified(job["id"], score)
            else:
                rejected_jobs.append(job_with_score)
                await self._mark_job_rejected(job["id"], score)
        
        return {
            "qualified_jobs": qualified_jobs,
            "rejected_jobs": rejected_jobs,
            "stats": {
                "total_evaluated": len(jobs),
                "qualified_count": len(qualified_jobs),
                "rejected_count": len(rejected_jobs),
                "qualification_rate": len(qualified_jobs) / len(jobs) if jobs else 0
            }
        }
    
    async def _score_job(self, job: Dict, user_profile: Dict) -> float:
        """
        Calculate multi-dimensional job score.
        
        Scoring components:
        - Skill match (0.35 weight)
        - Budget fit (0.25 weight)
        - Client quality (0.20 weight)
        - Competition level (0.10 weight)
        - Win probability (0.10 weight) - ML model prediction
        """
        scores = {}
        
        # 1. Skill Match Score
        scores["skill_match"] = self._calculate_skill_match(
            job["skills"],
            user_profile["skills"]
        )
        
        # 2. Budget Fit Score
        scores["budget_fit"] = self._calculate_budget_fit(
            job.get("budget_min"),
            job.get("budget_max"),
            user_profile.get("desired_hourly_rate"),
            user_profile.get("min_project_budget")
        )
        
        # 3. Client Quality Score
        scores["client_quality"] = self._calculate_client_quality(
            job.get("client_rating", 0),
            job.get("client_total_spent", 0),
            job.get("client_reviews_count", 0)
        )
        
        # 4. Competition Score (inverse - lower competition = higher score)
        scores["competition"] = self._calculate_competition_score(
            job.get("proposal_count", 0),
            job.get("time_since_posted_hours", 0)
        )
        
        # 5. Win Probability (ML model - placeholder for now)
        scores["win_probability"] = await self._predict_win_probability(
            job, user_profile
        )
        
        # Weighted sum
        weights = {
            "skill_match": 0.35,
            "budget_fit": 0.25,
            "client_quality": 0.20,
            "competition": 0.10,
            "win_probability": 0.10
        }
        
        final_score = sum(scores[k] * weights[k] for k in weights)
        
        return round(final_score, 3)
    
    def _calculate_skill_match(self, job_skills: List[str], user_skills: List[str]) -> float:
        """Calculate Jaccard similarity between job and user skills."""
        if not job_skills or not user_skills:
            return 0.0
        
        job_skills_lower = set(s.lower() for s in job_skills)
        user_skills_lower = set(s.lower() for s in user_skills)
        
        intersection = job_skills_lower & user_skills_lower
        union = job_skills_lower | user_skills_lower
        
        return len(intersection) / len(union) if union else 0.0
    
    def _calculate_budget_fit(
        self,
        job_budget_min: float,
        job_budget_max: float,
        user_desired_rate: float,
        user_min_budget: float
    ) -> float:
        """Score how well job budget aligns with user preferences."""
        if not job_budget_min:
            return 0.5  # Neutral score for unspecified budget
        
        # Check if job meets minimum budget requirement
        if job_budget_min < user_min_budget:
            return 0.0
        
        # Check if job budget is close to desired rate
        if user_desired_rate and job_budget_max:
            if job_budget_min <= user_desired_rate <= job_budget_max:
                return 1.0  # Perfect match
            elif job_budget_max >= user_desired_rate * 0.8:
                return 0.8  # Close match
        
        return 0.6  # Acceptable
    
    def _calculate_client_quality(
        self,
        client_rating: float,
        client_total_spent: float,
        client_reviews_count: int
    ) -> float:
        """Score client quality based on history."""
        score = 0.0
        
        # Rating component (0-5 stars → 0-0.5 score)
        if client_rating:
            score += (client_rating / 5.0) * 0.5
        
        # Spending history component (0-0.3 score)
        if client_total_spent:
            if client_total_spent > 10000:
                score += 0.3
            elif client_total_spent > 5000:
                score += 0.2
            elif client_total_spent > 1000:
                score += 0.1
        
        # Review count component (0-0.2 score)
        if client_reviews_count:
            if client_reviews_count > 20:
                score += 0.2
            elif client_reviews_count > 10:
                score += 0.15
            elif client_reviews_count > 5:
                score += 0.1
        
        return min(score, 1.0)
    
    def _calculate_competition_score(
        self,
        proposal_count: int,
        hours_since_posted: float
    ) -> float:
        """Lower competition = higher score."""
        if proposal_count == 0:
            return 1.0  # No competition yet!
        
        # Penalize high competition
        if proposal_count > 50:
            return 0.0
        elif proposal_count > 30:
            return 0.3
        elif proposal_count > 15:
            return 0.6
        else:
            return 0.8
    
    async def _predict_win_probability(
        self,
        job: Dict,
        user_profile: Dict
    ) -> float:
        """
        Predict win probability using ML model.
        Placeholder - to be implemented with trained model in Phase 7.
        """
        # TODO: Load trained model and make prediction
        return 0.5  # Placeholder neutral score
    
    async def _get_user_profile(self, user_id: UUID) -> Dict:
        """Fetch user profile with skills and preferences."""
        db = await get_db_pool()
        
        profile = await db.fetchrow("""
            SELECT 
                skills,
                desired_hourly_rate,
                min_project_budget,
                auto_bid_threshold,
                keywords
            FROM user_profiles
            WHERE user_id = $1
        """, user_id)
        
        return dict(profile) if profile else {}
    
    async def _get_jobs_to_qualify(
        self,
        user_id: UUID,
        job_ids: List[str] = None
    ) -> List[Dict]:
        """Get jobs needing qualification."""
        db = await get_db_pool()
        
        if job_ids:
            jobs = await db.fetch("""
                SELECT * FROM projects
                WHERE id = ANY($1) AND status = 'new'
            """, job_ids)
        else:
            jobs = await db.fetch("""
                SELECT * FROM projects
                WHERE status = 'new'
                ORDER BY discovered_at DESC
                LIMIT 100
            """)
        
        return [dict(job) for job in jobs]
    
    async def _mark_job_qualified(self, job_id: str, score: float):
        """Mark job as qualified in database."""
        db = await get_db_pool()
        await db.execute("""
            UPDATE projects
            SET status = 'qualified', qualification_score = $2
            WHERE id = $1
        """, job_id, score)
    
    async def _mark_job_rejected(self, job_id: str, score: float):
        """Mark job as rejected in database."""
        db = await get_db_pool()
        await db.execute("""
            UPDATE projects
            SET status = 'rejected', qualification_score = $2
            WHERE id = $1
        """, job_id, score)


# Singleton instance
qualification_agent = QualificationAgent()
```

---

### Generation Agent (CrewAI Multi-Agent)

```python
# backend/app/agents/generation.py

from typing import Dict, Any, List
from uuid import UUID
from crewai import Agent, Crew, Task, Process
from crewai_tools import Tool
from langchain_openai import ChatOpenAI
from app.config import settings
from app.services.vector_store import vector_store
from app.rag.graph_rag import graph_rag_service

class GenerationAgentCrew:
    """
    Multi-agent proposal generation using CrewAI.
    Coordinates a team of specialized agents for superior proposal quality.
    """
    
    def __init__(self):
        self.llm = ChatOpenAI(
            api_key=settings.openai_api_key,
            model="gpt-4-turbo",
            temperature=0.7
        )
    
    def create_crew(self, user_id: UUID, job: Dict, user_profile: Dict) -> Crew:
        """Create a crew of agents for this specific job."""
        
        # Define specialized agents
        researcher = self._create_researcher_agent(job)
        rag_specialist = self._create_rag_agent(user_id, job)
        writer = self._create_writer_agent(user_profile)
        reviewer = self._create_reviewer_agent()
        
        # Define tasks
        research_task = Task(
            description=f"""
            Analyze this job posting in depth:
            
            Title: {job['title']}
            Description: {job['description']}
            Skills: {', '.join(job.get('skills', []))}
            
            Extract:
            1. Core requirements and deliverables
            2. Client's pain points or challenges
            3. Success criteria for this project
            4. Technical keywords and technologies mentioned
            5. Tone and communication style of client
            
            Output a structured analysis.
            """,
            agent=researcher,
            expected_output="Structured job analysis with requirements, pain points, keywords"
        )
        
        rag_task = Task(
            description=f"""
            Based on the job analysis, retrieve the most relevant portfolio items,
            case studies, and past work examples from the knowledge base.
            
            Job requirements: {job['description'][:500]}
            Required skills: {', '.join(job.get('skills', []))}
            
            Find 3-5 highly relevant examples with specific outcomes and metrics.
            """,
            agent=rag_specialist,
            expected_output="List of relevant portfolio items with citations",
            context=[research_task]  # Depends on research
        )
        
        writing_task = Task(
            description=f"""
            Write a compelling, personalized proposal for this job.
            
            Use the job analysis and portfolio items to craft a proposal that:
            1. Directly addresses the client's stated requirements
            2. Cites specific past work examples (with outcomes)
            3. Shows understanding of their challenges
            4. Explains your approach clearly
            5. Includes a clear call-to-action
            
            Tone: {user_profile.get('default_tone', 'professional')}
            Length: 400-600 words
            
            Structure:
            - Opening (personalized greeting + hook)
            - Relevant experience (2-3 portfolio citations)
            - Approach (how you'll solve their problem)
            - Closing (CTA)
            """,
            agent=writer,
            expected_output="Complete proposal draft with citations",
            context=[research_task, rag_task]
        )
        
        review_task = Task(
            description="""
            Review the proposal draft for:
            1. Grammar and spelling errors
            2. Requirement coverage (does it address all stated needs?)
            3. Citation accuracy (are portfolio items relevant?)
            4. Tone consistency
            5. Length appropriateness
            
            Provide the final polished proposal or suggest specific revisions.
            """,
            agent=reviewer,
            expected_output="Final polished proposal ready for submission",
            context=[writing_task]
        )
        
        # Create crew
        crew = Crew(
            agents=[researcher, rag_specialist, writer, reviewer],
            tasks=[research_task, rag_task, writing_task, review_task],
            process=Process.sequential,  # Sequential execution
            verbose=True
        )
        
        return crew
    
    def _create_researcher_agent(self, job: Dict) -> Agent:
        """Create job analysis agent."""
        return Agent(
            role="Job Requirements Analyst",
            goal="Extract and structure all key requirements and context from job posting",
            backstory="""You are an expert at reading between the lines of job postings.
            You understand what clients really need, even when not explicitly stated.
            You identify technical requirements, soft skills needed, and success criteria.""",
            llm=self.llm,
            verbose=True
        )
    
    def _create_rag_agent(self, user_id: UUID, job: Dict) -> Agent:
        """Create RAG retrieval agent with GraphRAG access."""
        
        # Define RAG tool
        @Tool
        def search_portfolio(query: str) -> str:
            """Search user's portfolio and past work for relevant examples."""
            import asyncio
            loop = asyncio.get_event_loop()
            
            # Use GraphRAG for advanced retrieval
            results = loop.run_until_complete(
                graph_rag_service.retrieve_context(
                    user_id=user_id,
                    query=query,
                    top_k=5
                )
            )
            
            # Format results
            formatted = "\n\n".join([
                f"**{r['title']}**\n{r['content']}\nOutcome: {r.get('outcome', 'N/A')}"
                for r in results
            ])
            
            return formatted
        
        return Agent(
            role="Portfolio Specialist",
            goal="Find the most relevant past work examples to support this proposal",
            backstory="""You are an expert at matching job requirements to portfolio items.
            You know which past projects demonstrate the needed skills and outcomes.
            You always include specific metrics and achievements when available.""",
            tools=[search_portfolio],
            llm=self.llm,
            verbose=True
        )
    
    def _create_writer_agent(self, user_profile: Dict) -> Agent:
        """Create proposal writing agent."""
        return Agent(
            role="Proposal Copywriter",
            goal="Write a compelling, personalized proposal that wins the job",
            backstory=f"""You are a master proposal writer with years of experience.
            You know how to hook clients' attention, build credibility through examples,
            and close with confidence. You adapt your tone to match the client's style.
            
            Default tone: {user_profile.get('default_tone', 'professional and friendly')}
            Writing style: Clear, concise, outcome-focused""",
            llm=self.llm,
            verbose=True
        )
    
    def _create_reviewer_agent(self) -> Agent:
        """Create QA reviewer agent."""
        return Agent(
            role="Senior Proposal Reviewer",
            goal="Ensure proposal quality and requirement coverage",
            backstory="""You are a meticulous editor and quality assurance specialist.
            You catch errors, ensure alignment with requirements, and polish language.
            You have high standards and only approve excellent proposals.""",
            llm=self.llm,
            verbose=True
        )
    
    async def generate_proposal(
        self,
        user_id: UUID,
        job: Dict,
        user_profile: Dict
    ) -> Dict[str, Any]:
        """
        Execute the crew to generate a proposal.
        
        Returns:
            - proposal: Final proposal text
            - metadata: Generation metadata (agents used, time, tokens)
        """
        crew = self.create_crew(user_id, job, user_profile)
        
        # Execute crew (blocking - runs sequential tasks)
        result = crew.kickoff()
        
        return {
            "proposal": result,
            "metadata": {
                "agents_used": len(crew.agents),
                "model": "gpt-4-turbo",
                "process": "multi-agent-crewai"
            }
        }


# Singleton instance
generation_crew = GenerationAgentCrew()
```

---

## 🔄 LangGraph Orchestrator

```python
# backend/app/workflows/bidding_workflow.py

from typing import TypedDict, List, Annotated
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from uuid import UUID

from app.agents.discovery import discovery_agent
from app.agents.qualification import qualification_agent
from app.agents.generation import generation_crew


class BiddingWorkflowState(TypedDict):
    """State passed between agents in the workflow."""
    user_id: str
    discovered_jobs: List[dict]
    qualified_jobs: List[dict]
    generated_proposals: List[dict]
    submitted_bids: List[dict]
    errors: List[str]
    metadata: dict


class AutonomousBiddingWorkflow:
    """
    LangGraph-based autonomous bidding workflow.
    Orchestrates all agents in a stateful, resumable pipeline.
    """
    
    def __init__(self):
        self.workflow = self._build_workflow()
        # Memory saver for persistent state across runs
        self.checkpointer = MemorySaver()
        self.app = self.workflow.compile(checkpointer=self.checkpointer)
    
    def _build_workflow(self) -> StateGraph:
        """Build the LangGraph state machine."""
        workflow = StateGraph(BiddingWorkflowState)
        
        # Add nodes (agent execution steps)
        workflow.add_node("discover", self._discover_jobs_node)
        workflow.add_node("qualify", self._qualify_jobs_node)
        workflow.add_node("generate", self._generate_proposals_node)
        workflow.add_node("review", self._human_review_node)
        workflow.add_node("submit", self._submit_bids_node)
        
        # Define edges (workflow flow)
        workflow.set_entry_point("discover")
        workflow.add_edge("discover", "qualify")
        
        # Conditional: only generate if qualified jobs exist
        workflow.add_conditional_edges(
            "qualify",
            self._should_generate_proposals,
            {
                "generate": "generate",
                "skip": END
            }
        )
        
        # Conditional: high-value jobs need human review
        workflow.add_conditional_edges(
            "generate",
            self._should_require_review,
            {
                "review": "review",
                "auto_submit": "submit"
            }
        )
        
        workflow.add_edge("review", "submit")
        workflow.add_edge("submit", END)
        
        return workflow
    
    async def _discover_jobs_node(self, state: BiddingWorkflowState):
        """Discovery agent node."""
        result = await discovery_agent.invoke({
            "platforms": ["upwork", "freelancer"],
            "keywords": ["python", "fastapi", "backend"],  # TODO: Get from user profile
            "max_jobs": 50
        })
        
        state["discovered_jobs"] = result["discovered_jobs"]
        state["metadata"]["discovery"] = result["stats"]
        
        return state
    
    async def _qualify_jobs_node(self, state: BiddingWorkflowState):
        """Qualification agent node."""
        result = await qualification_agent.invoke({
            "user_id": state["user_id"],
            "job_ids": [j["id"] for j in state["discovered_jobs"]]
        })
        
        state["qualified_jobs"] = result["qualified_jobs"]
        state["metadata"]["qualification"] = result["stats"]
        
        return state
    
    async def _generate_proposals_node(self, state: BiddingWorkflowState):
        """Generation agent node (CrewAI)."""
        user_id = UUID(state["user_id"])
        generated = []
        
        for job in state["qualified_jobs"]:
            try:
                result = await generation_crew.generate_proposal(
                    user_id=user_id,
                    job=job,
                    user_profile={}  # TODO: Fetch user profile
                )
                
                generated.append({
                    "job_id": job["id"],
                    "proposal": result["proposal"],
                    "metadata": result["metadata"]
                })
            except Exception as e:
                state["errors"].append(f"Generation failed for job {job['id']}: {e}")
        
        state["generated_proposals"] = generated
        return state
    
    async def _human_review_node(self, state: BiddingWorkflowState):
        """Human review checkpoint."""
        # In production, this would:
        # 1. Send notification to user
        # 2. Wait for approval/rejection
        # 3. Resume workflow after user action
        
        # For now, auto-approve
        state["metadata"]["review"] = "auto_approved"
        return state
    
    async def _submit_bids_node(self, state: BiddingWorkflowState):
        """Submission agent node."""
        # TODO: Implement submission agent
        state["submitted_bids"] = []
        return state
    
    def _should_generate_proposals(self, state: BiddingWorkflowState) -> str:
        """Decide if we should generate proposals."""
        return "generate" if state["qualified_jobs"] else "skip"
    
    def _should_require_review(self, state: BiddingWorkflowState) -> str:
        """Decide if human review is required."""
        # High-value jobs (> $10k) need review
        for proposal in state["generated_proposals"]:
            job = next(j for j in state["qualified_jobs"] if j["id"] == proposal["job_id"])
            if job.get("budget_max", 0) > 10000:
                return "review"
        
        return "auto_submit"
    
    async def run(self, user_id: str):
        """Execute the workflow for a user."""
        initial_state = BiddingWorkflowState(
            user_id=user_id,
            discovered_jobs=[],
            qualified_jobs=[],
            generated_proposals=[],
            submitted_bids=[],
            errors=[],
            metadata={}
        )
        
        # Run until completion or breakpoint
        final_state = await self.app.ainvoke(
            initial_state,
            config={"configurable": {"thread_id": user_id}}
        )
        
        return final_state


# Singleton instance
autonomous_workflow = AutonomousBiddingWorkflow()
```

---

## 📅 Celery Background Tasks

```python
# backend/app/tasks/discovery_tasks.py

from celery import Celery
from app.config import settings
from app.workflows.bidding_workflow import autonomous_workflow

celery_app = Celery(
    'auto_bidder',
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend
)

celery_app.conf.update(
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
)


@celery_app.task(name="discover_and_qualify_jobs")
async def discover_and_qualify_jobs_task(user_id: str):
    """
    Background task: Discover and qualify jobs for a user.
    Runs every 15 minutes via Celery Beat.
    """
    try:
        # Run discovery + qualification workflow
        result = await autonomous_workflow.run(user_id=user_id)
        return {
            "status": "success",
            "discovered": len(result["discovered_jobs"]),
            "qualified": len(result["qualified_jobs"]),
            "errors": result["errors"]
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}


# Celery Beat schedule (periodic tasks)
celery_app.conf.beat_schedule = {
    'discover-jobs-every-15-minutes': {
        'task': 'discover_and_qualify_jobs',
        'schedule': 900.0,  # 15 minutes in seconds
        'args': ('user-id-placeholder',)  # TODO: Get active users from DB
    },
}
```

---

## 🚀 Putting It All Together

### Main Entry Point

```python
# backend/app/routers/autonomous.py

from fastapi import APIRouter, Depends, BackgroundTasks
from app.workflows.bidding_workflow import autonomous_workflow
from app.routers.auth import get_current_user

router = APIRouter(prefix="/api/autonomous", tags=["autonomous"])


@router.post("/start")
async def start_autonomous_bidding(
    background_tasks: BackgroundTasks,
    current_user = Depends(get_current_user)
):
    """
    Start autonomous bidding for the current user.
    Runs the full workflow: discover → qualify → generate → submit
    """
    user_id = str(current_user["user_id"])
    
    # Run workflow in background
    background_tasks.add_task(autonomous_workflow.run, user_id)
    
    return {
        "message": "Autonomous bidding started",
        "user_id": user_id,
        "status": "running"
    }


@router.get("/status")
async def get_autonomous_status(current_user = Depends(get_current_user)):
    """Get status of autonomous bidding workflow."""
    # TODO: Query workflow state from LangGraph checkpointer
    return {
        "status": "active",
        "last_run": "2026-03-06T10:30:00Z",
        "stats": {
            "jobs_discovered_today": 45,
            "jobs_qualified_today": 12,
            "proposals_generated_today": 3
        }
    }
```

---

## 📊 Next Steps

1. **Set up infrastructure** (Redis, Celery, Neo4j)
2. **Implement GraphRAG** (see next section)
3. **Test each agent** independently
4. **Integrate agents** into LangGraph workflow
5. **Deploy background tasks** with Celery Beat
6. **Monitor with LangSmith**

---

## 🔍 Coming Next

- **GraphRAG Implementation Guide** (graph_rag.py)
- **Platform Integration Examples** (Upwork/Freelancer APIs)
- **Monitoring & Debugging** (LangSmith setup)
- **Cost Optimization** (multi-model routing)

