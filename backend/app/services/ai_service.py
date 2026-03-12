"""
AI Service - LLM-powered Proposal Generation and Analysis

This service orchestrates the AI proposal generation process:
1. Retrieval (RAG) - Queries vector store for relevant knowledge.
2. Strategy Fetching - Retrieves custom instructions and system prompts.
3. Proposal Generation - Calls LLM (OpenAI or DeepSeek) to write the proposal.
"""

from typing import List, Optional, Dict, Any, Tuple
import logging
import json
import asyncio
from uuid import UUID

from langchain_openai import ChatOpenAI
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.messages import SystemMessage, HumanMessage

from app.config import settings
from app.services.vector_store import vector_store
from app.services.strategy_service import strategy_service
from app.services.keyword_service import keyword_service
from app.services.document_service import document_service
from app.models.ai import ProposalGenerateRequest, GeneratedProposal, RAGContext
from app.core.errors import AutoBidderError, RateLimitError

logger = logging.getLogger(__name__)


class AIService:
    """Service for managing AI operations and LLM interactions."""

    def __init__(self) -> None:
        """Initialize LLM clients based on configuration."""
        self._user_locks: Dict[str, asyncio.Lock] = {}  # FR-010: per-user generation lock
        self._locks_lock = asyncio.Lock()
        self.llm_provider = settings.llm_provider.lower()

        # Initialize OpenAI if configured
        if self.llm_provider == "openai" and settings.openai_api_key:
            self.chat_model = ChatOpenAI(
                api_key=settings.openai_api_key,
                model=settings.openai_completion_model,
                temperature=settings.openai_temperature,
                max_tokens=settings.openai_max_tokens,
            )
        # DeepSeek setup (simplified for now, using ChatOpenAI base as they are compatible)
        elif self.llm_provider == "deepseek" and settings.deepseek_api_key:
            self.chat_model = ChatOpenAI(
                api_key=settings.deepseek_api_key,
                base_url=settings.deepseek_api_base,
                model=settings.deepseek_model,
                temperature=settings.deepseek_temperature,
                max_tokens=settings.deepseek_max_tokens,
            )
        else:
            logger.warning(f"No LLM provider configuration found for {self.llm_provider}")
            self.chat_model = None

    async def generate_proposal(
        self,
        user_id: UUID,
        request: ProposalGenerateRequest
    ) -> GeneratedProposal:
        """
        Generate a fully tailored proposal from job context and RAG.

        Args:
            user_id: User's UUID
            request: Job data and optional strategy

        Returns:
            GeneratedProposal containing the final output
        """
        if not self.chat_model:
            raise AutoBidderError("LLM provider not configured. Please set API keys in .env")

        user_key = str(user_id)
        async with self._locks_lock:
            if user_key not in self._user_locks:
                self._user_locks[user_key] = asyncio.Lock()
            user_lock = self._user_locks[user_key]

        # FR-010: One concurrent generation per user; return 429 if busy
        if user_lock.locked():
            raise RateLimitError(
                "Another proposal is being generated. Please wait.",
                details={"retry_after_seconds": 30},
            )

        async with user_lock:
            try:
                return await self._generate_proposal_impl(user_id, request)
            finally:
                pass  # Lock released on context exit

    async def _generate_proposal_impl(
        self, user_id: UUID, request: ProposalGenerateRequest
    ) -> GeneratedProposal:
        """Internal implementation of proposal generation."""
        try:
            # 1. Fetch Strategy
            strategy = await self._get_relevant_strategy(user_id, request.strategy_id)

            # 2. Retrieve Relevant Context (RAG)
            context_data = await self._retrieve_rag_context(user_id, request)

            # 3. Fetch user keywords (skills/areas to emphasize)
            user_keywords: List[str] = []
            try:
                kw_list = await keyword_service.list_keywords(
                    str(user_id), is_active=True
                )
                user_keywords = [k.keyword for k in kw_list] if kw_list else []
            except Exception as ke:
                logger.debug("Could not load user keywords: %s", ke)

            # 4. Construct Prompt
            system_prompt = self._build_system_prompt(strategy)
            user_prompt = self._build_user_prompt(request, context_data, user_keywords)

            # 5. Call LLM
            logger.info(f"Generating proposal for user {user_id} with strategy {strategy.name}")

            # Prepare messages
            messages = [
                SystemMessage(content=system_prompt),
                HumanMessage(content=user_prompt)
            ]

            # Call completion
            response = await self.chat_model.ainvoke(messages)
            llm_result = response.content

            # 6. Extract Details (Title, Description, etc.)
            # For now, we simple-parse or use the whole text as description
            # In a more advanced version, we'd use Structured Output (Langchain tools)

            # Citation check (research.md §2): if RAG chunks provided but no overlap, append hint
            if context_data.relevant_chunks:
                chunk_words = set(
                    w for w in " ".join(
                        c.get("document", "") for c in context_data.relevant_chunks
                    ).lower().split() if len(w) >= 4
                )
                content_words = set(llm_result.lower().split())
                overlap = chunk_words & content_words
                has_citation = len(overlap) >= 3
                if not has_citation:
                    logger.warning(
                        "RAG context provided but proposal has no clear citation"
                    )
                    llm_result += "\n\n[Based on my portfolio and relevant experience.]"

            # Simple parsing of title if AI followed a format like "Title: ... \n\n Content: ..."
            title = f"AI Proposal for: {request.job_title}"
            content = llm_result.strip()

            if "Title:" in llm_result[:50]:
                parts = llm_result.split("\n\n", 1)
                title_part = parts[0].replace("Title:", "").strip()
                if title_part:
                    title = title_part
                    content = parts[1].strip() if len(parts) > 1 else content

            # T032: Score proposal quality (FR-009)
            try:
                from app.services.proposal_quality_service import score_proposal
                quality = score_proposal(
                    content,
                    request.job_description,
                    request.job_skills or [],
                )
            except Exception as qe:
                logger.warning("Proposal quality scoring failed: %s", qe)
                quality = None

            return GeneratedProposal(
                title=title,
                description=content,
                ai_model=settings.openai_completion_model if self.llm_provider == "openai" else settings.deepseek_model,
                strategy_id=str(strategy.id),
                confidence_score=0.9,  # Placeholder
                quality_score=quality["overall_score"] if quality else None,
                quality_breakdown=quality["dimension_scores"] if quality else None,
                quality_suggestions=quality["suggestions"] if quality else None,
            )

        except Exception as e:
            logger.error(f"Failed to generate proposal: {e}")
            raise AutoBidderError(f"AI Generation failed: {str(e)}")

    async def _get_relevant_strategy(self, user_id: UUID, strategy_id: Optional[str]) -> Any:
        """Fetch specified strategy or fall back to user's default."""
        if strategy_id:
            logger.debug(f"Fetching strategy by ID: {strategy_id}")
            strategy = await strategy_service.get_strategy(strategy_id, str(user_id))
            if strategy:
                return strategy

        # Fallback to default
        logger.debug(f"Fetching default strategy for user {user_id}")
        strategies = await strategy_service.list_strategies(str(user_id))

        # Find default or first available
        for s in strategies:
            if s.is_default:
                return s

        if strategies:
            return strategies[0]

        # Hard fallback if no strategies exist
        raise AutoBidderError("No bidding strategies found for user. Please create a strategy first.")

    async def _retrieve_rag_context(self, user_id: UUID, request: ProposalGenerateRequest) -> RAGContext:
        """Perform similarity search to find relevant knowledge chunks."""
        # Query ChromaDB with job title and description
        search_query = f"{request.job_title} {request.job_description}"

        # We need query embeddings. DocumentService has embedding_model for local MiniLM.
        # AIService can also use it.
        query_embedding = document_service.embedding_model.encode(
            [search_query],
            convert_to_numpy=True
        )[0].tolist()

        # Search collections: use request.collections if specified, else all
        default_collections = ["case_studies", "team_profiles", "portfolio", "general_kb"]
        collections = (
            [c if c != "other" else "general_kb" for c in request.collections]
            if request.collections
            else default_collections
        )
        all_relevant_chunks = []

        for coll in collections:
            try:
                results = await vector_store.similarity_search(
                    collection_name=coll,
                    user_id=str(user_id),
                    query_embedding=query_embedding,
                    top_k=3
                )
                all_relevant_chunks.extend(results)
            except Exception as e:
                logger.debug(f"Search in collection {coll} failed or empty: {e}")

        return RAGContext(
            query=search_query,
            relevant_chunks=all_relevant_chunks,
            total_chunks=len(all_relevant_chunks)
        )

    def _build_system_prompt(self, strategy: Any) -> str:
        """Construct the system prompt incorporating strategy settings (FR-001, FR-003)."""
        base_instructions = str(strategy.system_prompt)

        # FR-001, FR-003: Explicitly require citing portfolio and addressing job skills
        citation_instr = (
            "\nYou MUST cite or reference the relevant experience from the portfolio "
            "context when provided. Use specific examples, project names, or outcomes."
        )
        skills_instr = (
            "\nYou MUST explicitly address the key skills and deliverables mentioned "
            "in the job description. Show how your experience matches each requirement."
        )
        tone_instr = f"\nTone: {strategy.tone}"
        focus_instr = f"\nFocus Areas: {', '.join(strategy.focus_areas)}" if strategy.focus_areas else ""

        # Do NOT include closing signatures - the email system adds professional signature automatically
        no_signature_instr = (
            "\n\nIMPORTANT: Do NOT include closing signatures, sign-offs, or contact information "
            "(such as 'Sincerely', 'Thank you for your consideration', 'Best regards', name, phone, email, etc.). "
            "End the proposal with your final value proposition or call-to-action. "
            "The professional signature with contact details will be added automatically by the email system."
        )

        return f"{base_instructions}{citation_instr}{skills_instr}{tone_instr}{focus_instr}{no_signature_instr}\n\n" \
               f"Response Format: Start with 'Title: [Brief Compelling Title]' followed by the full proposal content."

    def _build_user_prompt(
        self,
        request: ProposalGenerateRequest,
        context: RAGContext,
        user_keywords: Optional[List[str]] = None,
    ) -> str:
        """Construct the user prompt combining job context, RAG data, and user keywords."""

        # Format Job Info
        job_info = f"TARGET JOB:\nTitle: {request.job_title}\n"
        if request.job_company:
            job_info += f"Company: {request.job_company}\n"
        job_info += f"Description: {request.job_description}\n"
        if request.job_skills:
            job_info += f"Skills Needed: {', '.join(request.job_skills)}\n"

        # Structured job analysis from dataset (Core Responsibilities, Required Skills, etc.)
        # Use this to ensure the proposal explicitly addresses each key requirement
        if request.job_model_response:
            job_info += f"\nSTRUCTURED JOB ANALYSIS (address each section in your proposal):\n{request.job_model_response}\n"

        # User's keywords/skills to emphasize (from their profile)
        if user_keywords:
            job_info += f"\nMY KEY SKILLS/AREAS (emphasize these when relevant): {', '.join(user_keywords)}\n"

        # Format RAG context (portfolio, case studies, etc.)
        context_str = ""
        if context.relevant_chunks:
            context_str = "\nRELEVANT EXPERIENCE FROM MY PORTFOLIO:\n"
            for chunk in context.relevant_chunks:
                context_str += f"- {chunk.get('document', '')}\n"

        # Additional context or instructions
        extra = ""
        if request.extra_context:
            extra += f"\nADDITIONAL INFO: {request.extra_context}\n"
        if request.custom_instructions:
            extra += f"\nCUSTOM INSTRUCTIONS: {request.custom_instructions}\n"

        return f"{job_info}{context_str}{extra}\n\nPlease write a tailored, professional, and winning proposal for this job."


# Singleton instance
ai_service = AIService()


async def generate_text(prompt: str) -> str:
    """
    Generate text from a single prompt using the configured LLM.
    Useful for simple AI interactions like chatbot or summarization.
    """
    if not ai_service.chat_model:
        logger.warning("generate_text called but AI chat_model is not configured")
        return "LLM provider not configured. Please check your .env settings."

    try:
        response = await ai_service.chat_model.ainvoke([HumanMessage(content=prompt)])
        return response.content
    except Exception as e:
        logger.error(f"Error in generate_text: {e}")
        return f"Sorry, I encountered an error while processing your request: {str(e)}"
