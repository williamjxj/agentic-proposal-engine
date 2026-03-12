"""
Project Scoring Service - Keyword Matching & Ranking

Calculates match scores between projects and user keywords/skills.
Uses hybrid approach: exact match + semantic similarity + TF-IDF.

Algorithm weights:
- 30% Exact skill/keyword match
- 20% Semantic similarity (embeddings)
- 15% Title keyword match
- 15% Description keyword density
- 15% TF-IDF weighted keywords
- 5%  Budget alignment

Scores stored in user_project_qualifications table for caching.
"""

import json
import logging
from typing import Any, Optional

import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from app.core.database import get_db_pool
from app.services.document_service import document_service
from app.services.keyword_service import keyword_service

logger = logging.getLogger(__name__)


class ProjectScoringService:
    """Service for calculating project-user match scores."""

    def __init__(self) -> None:
        """Initialize scoring service with embedding model."""
        self.embedding_model = document_service.embedding_model
        self.tfidf_vectorizer = TfidfVectorizer(
            max_features=100,
            stop_words='english',
            lowercase=True
        )

    async def score_project_for_user(
        self,
        project_id: str,
        user_id: str,
        project_data: dict[str, Any],
        force_recalculate: bool = False
    ) -> tuple[float, dict[str, Any]]:
        """
        Calculate match score for a single project.

        Args:
            project_id: Project UUID
            user_id: User UUID
            project_data: Dict with title, description, skills, etc.
            force_recalculate: Skip cache and recalculate

        Returns:
            Tuple of (score, breakdown_dict)
        """
        # Check cache first (scores valid for 7 days)
        if not force_recalculate:
            cached = await self._get_cached_score(project_id, user_id)
            if cached:
                logger.debug(f"Using cached score for project {project_id}")
                return cached

        # Get user context (keywords + skills)
        user_context = await self._get_user_context(user_id)

        if not user_context.get('keywords') and not user_context.get('skills'):
            logger.warning(f"No keywords or skills for user {user_id}, scoring as 0")
            return 0.0, {"error": "No keywords or skills defined for user"}

        # Calculate score
        score, breakdown = self._calculate_score(project_data, user_context)

        # Store in database
        await self._store_score(project_id, user_id, score, breakdown)

        logger.info(f"Scored project {project_id} for user {user_id}: {score}")
        return score, breakdown

    async def score_projects_batch(
        self,
        user_id: str,
        project_ids: list[str] | None = None,
        force_recalculate: bool = False,
        limit: int = 100
    ) -> dict[str, tuple[float, dict[str, Any]]]:
        """
        Score multiple projects efficiently.

        Args:
            user_id: User UUID
            project_ids: List of project UUIDs to score (None = all unscored)
            force_recalculate: Skip cache and recalculate all
            limit: Maximum projects to score in one batch

        Returns:
            Dict mapping project_id -> (score, breakdown)
        """
        pool = await get_db_pool()

        # Get user context once
        user_context = await self._get_user_context(user_id)
        if not user_context.get('keywords') and not user_context.get('skills'):
            logger.warning(f"No keywords/skills for user {user_id}, cannot score")
            return {}

        # Query projects to score
        if project_ids:
            # Score specific projects
            projects = await pool.fetch(
                """
                SELECT id, title, description, skills_required as skills,
                       budget_min, budget_max
                FROM projects
                WHERE id = ANY($1::uuid[])
                LIMIT $2
                """,
                project_ids,
                limit
            )
        elif force_recalculate:
            # Recalculate all projects for user
            projects = await pool.fetch(
                """
                SELECT id, title, description, skills_required as skills,
                       budget_min, budget_max
                FROM projects
                LIMIT $1
                """,
                limit
            )
        else:
            # Score only unscored or stale projects (> 7 days old)
            projects = await pool.fetch(
                """
                SELECT p.id, p.title, p.description, p.skills_required as skills,
                       p.budget_min, p.budget_max
                FROM projects p
                WHERE NOT EXISTS (
                    SELECT 1 FROM user_project_qualifications upq
                    WHERE upq.project_id = p.id
                    AND upq.user_id = $1::uuid
                    AND upq.updated_at > NOW() - INTERVAL '7 days'
                )
                LIMIT $2
                """,
                user_id,
                limit
            )

        logger.info(f"Scoring {len(projects)} projects for user {user_id}")

        results = {}
        for proj in projects:
            try:
                project_data = {
                    'id': str(proj['id']),
                    'title': proj['title'],
                    'description': proj['description'],
                    'skills': proj['skills'] or [],
                    'budget_min': float(proj['budget_min']) if proj['budget_min'] else None,
                    'budget_max': float(proj['budget_max']) if proj['budget_max'] else None,
                }

                score, breakdown = await self.score_project_for_user(
                    project_id=str(proj['id']),
                    user_id=user_id,
                    project_data=project_data,
                    force_recalculate=force_recalculate
                )

                results[str(proj['id'])] = (score, breakdown)

            except Exception as e:
                logger.error(f"Failed to score project {proj['id']}: {e}")
                continue

        return results

    def _calculate_score(
        self, project: dict[str, Any], user_context: dict[str, Any]
    ) -> tuple[float, dict[str, Any]]:
        """
        Core scoring algorithm.

        Args:
            project: Dict with title, description, skills, etc.
            user_context: Dict with keywords, skills, budget_range

        Returns:
            Tuple of (total_score, breakdown_dict)
        """
        scores = {}

        user_keywords = user_context.get('keywords', [])
        user_skills = user_context.get('skills', [])
        all_user_terms = list(set(user_keywords + user_skills))

        if not all_user_terms:
            return 0.0, {"error": "No keywords or skills to match"}

        project_skills = [s.lower() for s in (project.get('skills') or [])]
        project_title = (project.get('title') or '').lower()
        project_desc = (project.get('description') or '').lower()

        all_user_terms_lower = [t.lower() for t in all_user_terms]

        # 1. Exact skill/keyword match (30%)
        skill_overlap = len(set(project_skills) & set(all_user_terms_lower))
        scores['skill_exact'] = (skill_overlap / len(all_user_terms)) * 30

        # 2. Semantic similarity using embeddings (20%)
        try:
            project_text = f"{project_title} {project_desc} {' '.join(project_skills)}"
            user_text = " ".join(all_user_terms)

            proj_emb = self.embedding_model.encode([project_text], convert_to_numpy=True)[0]
            user_emb = self.embedding_model.encode([user_text], convert_to_numpy=True)[0]

            # Cosine similarity
            sim = np.dot(proj_emb, user_emb) / (
                np.linalg.norm(proj_emb) * np.linalg.norm(user_emb) + 1e-8
            )
            scores['semantic'] = float(sim) * 20

        except Exception as e:
            logger.warning(f"Semantic scoring failed: {e}")
            scores['semantic'] = 0.0

        # 3. Title keyword match (15%)
        title_matches = sum(1 for kw in all_user_terms_lower if kw in project_title)
        scores['title'] = (title_matches / len(all_user_terms)) * 15

        # 4. Description keyword density (15%)
        desc_matches = sum(project_desc.count(kw) for kw in all_user_terms_lower)
        # Cap at 15 points to avoid over-rewarding keyword stuffing
        scores['description'] = min((desc_matches / len(all_user_terms)) * 15, 15.0)

        # 5. TF-IDF weighted keywords (15%)
        try:
            tfidf_score = self._tfidf_match(project_desc, all_user_terms_lower)
            scores['tfidf'] = tfidf_score * 15
        except Exception as e:
            logger.debug(f"TF-IDF scoring failed: {e}")
            scores['tfidf'] = 0.0

        # 6. Budget alignment (5%)
        # For now, neutral score. Can enhance with user budget preferences
        user_budget_range = user_context.get('budget_range')
        if user_budget_range and project.get('budget_min') and project.get('budget_max'):
            budget_score = self._budget_overlap(
                user_budget_range,
                (project['budget_min'], project['budget_max'])
            )
            scores['budget'] = budget_score * 5
        else:
            scores['budget'] = 5.0  # Neutral

        # Calculate total
        total = sum(scores.values())

        # Build breakdown with matched items
        matched_keywords = [
            kw for kw in all_user_terms
            if kw.lower() in project_desc or kw.lower() in project_title
        ]
        matched_skills = [
            s for s in (project.get('skills') or [])
            if s.lower() in all_user_terms_lower
        ]

        breakdown = {
            "total_score": round(total, 1),
            "breakdown": {k: round(v, 1) for k, v in scores.items()},
            "matched_keywords": matched_keywords[:10],  # Top 10
            "matched_skills": matched_skills[:10],
            "user_terms_count": len(all_user_terms)
        }

        return round(total, 1), breakdown

    def _tfidf_match(self, text: str, keywords: list[str]) -> float:
        """
        TF-IDF based keyword matching.

        Args:
            text: Project description
            keywords: User keywords

        Returns:
            Similarity score 0-1
        """
        if not text or not keywords:
            return 0.0

        try:
            # Build corpus: [project_text] + [each_keyword]
            corpus = [text] + keywords

            # Fit TF-IDF
            tfidf_matrix = self.tfidf_vectorizer.fit_transform(corpus)

            # Calculate similarity between project and each keyword
            similarities = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:])

            # Return average similarity
            return float(np.mean(similarities))

        except Exception as e:
            logger.debug(f"TF-IDF calculation failed: {e}")
            return 0.0

    def _budget_overlap(
        self, user_range: tuple[float, float], project_range: tuple[float, float]
    ) -> float:
        """
        Calculate budget range overlap (0-1).

        Args:
            user_range: (min, max) user budget preference
            project_range: (min, max) project budget

        Returns:
            Overlap score 0-1
        """
        user_min, user_max = user_range
        proj_min, proj_max = project_range

        # Calculate overlap
        overlap_min = max(user_min, proj_min)
        overlap_max = min(user_max, proj_max)

        if overlap_max < overlap_min:
            return 0.0  # No overlap

        overlap = overlap_max - overlap_min
        user_span = user_max - user_min
        proj_span = proj_max - proj_min

        # Normalize by average span
        avg_span = (user_span + proj_span) / 2
        return min(overlap / avg_span, 1.0) if avg_span > 0 else 0.0

    async def _get_user_context(self, user_id: str) -> dict[str, Any]:
        """
        Get user keywords, skills, and preferences.

        Args:
            user_id: User UUID

        Returns:
            Dict with keywords, skills, budget_range
        """
        context = {
            'keywords': [],
            'skills': [],
            'budget_range': None
        }

        # Get active keywords
        try:
            keywords = await keyword_service.list_keywords(user_id, is_active=True)
            context['keywords'] = [k.keyword for k in keywords] if keywords else []
        except Exception as e:
            logger.warning(f"Failed to get keywords for user {user_id}: {e}")

        # Get skills from user profile (optional enhancement)
        # For now, keywords serve as both keywords and skills
        context['skills'] = context['keywords']

        # Get budget preference (optional enhancement)
        # For now, no budget filtering
        context['budget_range'] = None

        return context

    async def _get_cached_score(
        self, project_id: str, user_id: str
    ) -> tuple[float, dict[str, Any]] | None:
        """
        Get cached score from database if valid (< 7 days old).

        Args:
            project_id: Project UUID
            user_id: User UUID

        Returns:
            Tuple of (score, breakdown) or None if not cached
        """
        pool = await get_db_pool()

        try:
            row = await pool.fetchrow(
                """
                SELECT qualification_score, qualification_reason, updated_at
                FROM user_project_qualifications
                WHERE project_id = $1::uuid
                AND user_id = $2::uuid
                AND updated_at > NOW() - INTERVAL '7 days'
                """,
                project_id,
                user_id
            )

            if row:
                score = float(row['qualification_score'])
                breakdown = json.loads(row['qualification_reason']) if row['qualification_reason'] else {}
                return score, breakdown

        except Exception as e:
            logger.debug(f"Failed to get cached score: {e}")

        return None

    async def _store_score(
        self, project_id: str, user_id: str, score: float, breakdown: dict[str, Any]
    ) -> None:
        """
        Store score in user_project_qualifications table.

        Args:
            project_id: Project UUID
            user_id: User UUID
            score: Match score 0-100
            breakdown: JSON-serializable breakdown dict
        """
        pool = await get_db_pool()

        try:
            await pool.execute(
                """
                INSERT INTO user_project_qualifications
                    (user_id, project_id, qualification_score, qualification_reason, updated_at)
                VALUES ($1::uuid, $2::uuid, $3, $4, NOW())
                ON CONFLICT (user_id, project_id)
                DO UPDATE SET
                    qualification_score = EXCLUDED.qualification_score,
                    qualification_reason = EXCLUDED.qualification_reason,
                    updated_at = NOW()
                """,
                user_id,
                project_id,
                score,
                json.dumps(breakdown)
            )

        except Exception as e:
            logger.error(f"Failed to store score: {e}")
            raise


# Singleton instance
project_scoring_service = ProjectScoringService()
