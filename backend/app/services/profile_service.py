"""
Profile Service

Manages user profile information with smart fallback:
1. First checks knowledge base documents (resume/CV metadata)
2. Falls back to .env configuration if knowledge base is empty

This ensures a single source of truth while providing sensible defaults.
"""

import logging
import re
from dataclasses import dataclass

from app.config import settings
from app.core.database import get_db_pool

logger = logging.getLogger(__name__)


@dataclass
class UserProfile:
    """User profile information for email signatures and display."""
    
    full_name: str
    title: str
    email: str
    phone: str | None = None
    website: str | None = None
    linkedin: str | None = None
    github: str | None = None
    
    @property
    def has_complete_info(self) -> bool:
        """Check if profile has all essential information."""
        return bool(self.full_name and self.title and self.email)


class ProfileService:
    """
    Service for retrieving user profile information.
    
    Priority order:
    1. Knowledge base documents (primary source)
    2. Environment configuration (fallback defaults)
    """
    
    async def get_user_profile(self, user_id: str) -> UserProfile:
        """
        Get user profile with smart fallback.
        
        Args:
            user_id: User's UUID
            
        Returns:
            UserProfile with information from KB or defaults
        """
        # Try to get profile from knowledge base
        kb_profile = await self._get_profile_from_knowledge_base(user_id)
        
        if kb_profile and kb_profile.has_complete_info:
            logger.info(f"Using profile from knowledge base for user {user_id}")
            return kb_profile
        
        # Fall back to .env defaults
        logger.info(f"Using default profile from .env for user {user_id}")
        return self._get_default_profile()
    
    async def _get_profile_from_knowledge_base(self, user_id: str) -> UserProfile | None:
        """
        Extract profile from knowledge base documents.
        
        Looks for resume/CV documents and extracts metadata.
        
        Args:
            user_id: User's UUID
            
        Returns:
            UserProfile from KB or None if not found
        """
        try:
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                # Query knowledge base documents for user
                # Look for documents with profile metadata (title, email, phone, etc.)
                row = await conn.fetchrow(
                    """
                    SELECT
                        title,
                        email,
                        phone,
                        reference_url,
                        contact_url,
                        filename
                    FROM knowledge_base_documents
                    WHERE user_id = $1
                      AND email IS NOT NULL
                      AND title IS NOT NULL
                    ORDER BY
                        CASE
                            WHEN filename ILIKE '%resume%' OR filename ILIKE '%cv%' THEN 1
                            ELSE 2
                        END,
                        uploaded_at DESC
                    LIMIT 1
                    """,
                    user_id
                )
                
                if not row:
                    logger.debug(f"No profile found in knowledge base for user {user_id}")
                    return None
                
                # Extract profile information from metadata
                full_name = row['title'] or None  # title field stores the person's name/title
                email = row['email']
                phone = row['phone']
                website = row['reference_url']
                linkedin = None
                github = None
                
                # Parse contact_url for LinkedIn/GitHub
                if row['contact_url']:
                    contact_url = row['contact_url']
                    if 'linkedin.com' in contact_url.lower():
                        linkedin = contact_url
                    elif 'github.com' in contact_url.lower():
                        github = contact_url
                
                # Try to extract name and title separately if title contains both
                name = full_name
                title = None
                
                if full_name and (' - ' in full_name or ' | ' in full_name):
                    # Format like "John Doe - Software Engineer" or "John Doe | Developer"
                    parts = re.split(r'\s*[-|]\s*', full_name, maxsplit=1)
                    if len(parts) == 2:
                        name = parts[0].strip()
                        title = parts[1].strip()
                
                # If we don't have a separate title, use a generic one
                if not title:
                    title = "Professional"  # Generic default
                
                return UserProfile(
                    full_name=name or "User",
                    title=title,
                    email=email,
                    phone=phone,
                    website=website,
                    linkedin=linkedin,
                    github=github,
                )
                
        except Exception as e:
            logger.warning(f"Error retrieving profile from knowledge base: {e}")
            return None
    
    def _get_default_profile(self) -> UserProfile:
        """
        Get default profile from environment configuration.
        
        Returns:
            UserProfile with values from settings
        """
        return UserProfile(
            full_name=settings.user_full_name or "User",
            title=settings.user_title or "Professional",
            email=settings.company_email or settings.proposal_submit_email or "contact@example.com",
            phone=settings.company_phone,
            website=settings.company_website,
            linkedin=settings.user_linkedin,
            github=settings.user_github,
        )
    
    async def update_profile_from_document(
        self,
        user_id: str,
        document_id: str,
        profile_data: dict
    ) -> bool:
        """
        Update knowledge base document with profile metadata.
        
        This can be called after uploading a resume to extract and store profile info.
        
        Args:
            user_id: User's UUID
            document_id: Document UUID
            profile_data: Dict with keys: title, email, phone, reference_url, contact_url
            
        Returns:
            True if successful
        """
        try:
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    """
                    UPDATE knowledge_base_documents
                    SET
                        title = COALESCE($3, title),
                        email = COALESCE($4, email),
                        phone = COALESCE($5, phone),
                        reference_url = COALESCE($6, reference_url),
                        contact_url = COALESCE($7, contact_url),
                        updated_at = CURRENT_TIMESTAMP
                    WHERE id = $1 AND user_id = $2
                    """,
                    document_id,
                    user_id,
                    profile_data.get('title'),
                    profile_data.get('email'),
                    profile_data.get('phone'),
                    profile_data.get('reference_url'),
                    profile_data.get('contact_url'),
                )
                
                logger.info(f"Updated profile metadata for document {document_id}")
                return True
                
        except Exception as e:
            logger.error(f"Error updating profile metadata: {e}")
            return False


# Singleton instance
profile_service = ProfileService()
