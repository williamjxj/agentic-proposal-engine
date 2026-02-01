"""
Session Manager Service

Manages user session state operations including retrieval, updates, and deletion.
Coordinates with Supabase client for database operations.
"""

from typing import Optional, Dict, Any
import logging
from datetime import datetime

from app.models.session_state import (
    SessionState,
    SessionStateCreate,
    SessionStateUpdate,
)
from app.services.supabase_client import supabase_service
from app.core.errors import AutoBidderError

logger = logging.getLogger(__name__)


class SessionManager:
    """
    Manages session state operations for users.
    
    Provides methods to get, update, and delete session states with
    proper validation and error handling.
    """
    
    def __init__(self) -> None:
        """Initialize session manager."""
        self.supabase = supabase_service
    
    async def get_state(self, user_id: str) -> Optional[SessionState]:
        """
        Get user's session state.
        
        Args:
            user_id: User's UUID
            
        Returns:
            SessionState object or None if not found
        """
        try:
            data = await self.supabase.get_session_state(user_id)
            
            if not data:
                return None
            
            # Map entity_id from database to active_entity_id for model
            if "entity_id" in data and "active_entity_id" not in data:
                data["active_entity_id"] = data.pop("entity_id")
            
            return SessionState(**data)
        except Exception as e:
            logger.error(f"Error getting session state for user {user_id}: {e}")
            raise AutoBidderError(f"Failed to get session state: {e}")
    
    async def create_state(
        self,
        user_id: str,
        session_data: SessionStateCreate,
    ) -> SessionState:
        """
        Create new session state for user.
        
        Args:
            user_id: User's UUID
            session_data: Session state data to create
            
        Returns:
            Created SessionState object
            
        Raises:
            AutoBidderError: If creation fails
        """
        try:
            # Convert Pydantic model to dict
            # Map active_entity_id to entity_id to match database schema
            data_dict: Dict[str, Any] = {
                "user_id": user_id,
                "current_path": session_data.current_path,
                "navigation_history": [
                    entry.model_dump() for entry in session_data.navigation_history
                ],
                "active_entity_type": session_data.active_entity_type,
                "entity_id": session_data.active_entity_id,  # Map to database column name
                "scroll_position": session_data.scroll_position,
                "filters": session_data.filters,
                "ui_state": session_data.ui_state,
            }
            
            result = await self.supabase.upsert_session_state(user_id, data_dict)
            
            # Map entity_id from database to active_entity_id for model
            if "entity_id" in result and "active_entity_id" not in result:
                result["active_entity_id"] = result.pop("entity_id")
            
            return SessionState(**result)
        except Exception as e:
            logger.error(f"Error creating session state for user {user_id}: {e}")
            raise AutoBidderError(f"Failed to create session state: {e}")
    
    async def update_state(
        self,
        user_id: str,
        session_update: SessionStateUpdate,
    ) -> SessionState:
        """
        Update user's session state.
        
        Args:
            user_id: User's UUID
            session_update: Session state updates (only provided fields will be updated)
            
        Returns:
            Updated SessionState object
            
        Raises:
            AutoBidderError: If update fails
        """
        try:
            # Get current state
            current = await self.get_state(user_id)
            
            # Build update dict with only provided fields
            update_dict: Dict[str, Any] = {"user_id": user_id}
            
            if session_update.current_path is not None:
                update_dict["current_path"] = session_update.current_path
            elif current:
                update_dict["current_path"] = current.current_path
            else:
                update_dict["current_path"] = "/"
            
            if session_update.navigation_history is not None:
                update_dict["navigation_history"] = [
                    entry.model_dump() for entry in session_update.navigation_history
                ]
            elif current:
                update_dict["navigation_history"] = [
                    entry.model_dump() for entry in current.navigation_history
                ]
            else:
                update_dict["navigation_history"] = []
            
            if session_update.active_entity_type is not None:
                update_dict["active_entity_type"] = session_update.active_entity_type
            elif current:
                update_dict["active_entity_type"] = current.active_entity_type
            
            if session_update.active_entity_id is not None:
                update_dict["entity_id"] = session_update.active_entity_id  # Map to database column name
            elif current:
                update_dict["entity_id"] = current.active_entity_id  # Map to database column name
            
            if session_update.scroll_position is not None:
                update_dict["scroll_position"] = session_update.scroll_position
            elif current:
                update_dict["scroll_position"] = current.scroll_position
            else:
                update_dict["scroll_position"] = {}
            
            if session_update.filters is not None:
                update_dict["filters"] = session_update.filters
            elif current:
                update_dict["filters"] = current.filters
            else:
                update_dict["filters"] = {}
            
            if session_update.ui_state is not None:
                update_dict["ui_state"] = session_update.ui_state
            elif current:
                update_dict["ui_state"] = current.ui_state
            else:
                update_dict["ui_state"] = {}
            
            # Upsert (create or update)
            result = await self.supabase.upsert_session_state(user_id, update_dict)
            
            # Map entity_id from database to active_entity_id for model
            if "entity_id" in result and "active_entity_id" not in result:
                result["active_entity_id"] = result.pop("entity_id")
            
            return SessionState(**result)
        except Exception as e:
            logger.error(f"Error updating session state for user {user_id}: {e}")
            raise AutoBidderError(f"Failed to update session state: {e}")
    
    async def delete_state(self, user_id: str) -> None:
        """
        Delete user's session state.
        
        Args:
            user_id: User's UUID
        """
        try:
            await self.supabase.delete_session_state(user_id)
            logger.info(f"Deleted session state for user {user_id}")
        except Exception as e:
            logger.error(f"Error deleting session state for user {user_id}: {e}")
            # Don't raise - deletion is a non-critical operation
    
    async def cleanup_expired(self, ttl_hours: int = 24) -> int:
        """
        Clean up expired session states.
        
        Args:
            ttl_hours: Time-to-live in hours for session states
            
        Returns:
            Number of sessions cleaned up
        """
        try:
            # This would require a custom SQL query or RPC function
            # For now, log that cleanup would happen here
            logger.info(f"Session cleanup triggered (TTL: {ttl_hours}h)")
            # TODO: Implement cleanup query
            return 0
        except Exception as e:
            logger.error(f"Error cleaning up expired sessions: {e}")
            return 0


# Global instance
session_manager = SessionManager()
