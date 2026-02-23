"""
Session Manager Service

Manages user session state operations including retrieval, updates, and deletion.
Uses PostgreSQL connection pool for database operations.
"""
import json
from typing import Optional, Dict, Any
import logging
from datetime import datetime

from app.models.session_state import (
    SessionState,
    SessionStateCreate,
    SessionStateUpdate,
)
from app.core.database import get_db_pool
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
        pass
    
    async def get_state(self, user_id: str) -> Optional[SessionState]:
        """
        Get user's session state.
        
        Args:
            user_id: User's UUID
            
        Returns:
            SessionState object or None if not found
        """
        try:
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    "SELECT * FROM user_session_states WHERE user_id = $1",
                    user_id
                )
                
                if not row:
                    return None
                
                data = dict(row)
                # Convert UUID objects to strings for Pydantic validation
                if "id" in data and data["id"]:
                    data["id"] = str(data["id"])
                if "user_id" in data and data["user_id"]:
                    data["user_id"] = str(data["user_id"])
                if "entity_id" in data and data["entity_id"]:
                    data["entity_id"] = str(data["entity_id"])
                
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
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                # Convert Pydantic model to dict and map active_entity_id to entity_id
                navigation_history = json.dumps([
                    entry.model_dump() for entry in session_data.navigation_history
                ])
                
                row = await conn.fetchrow(
                    """
                    INSERT INTO user_session_states 
                    (user_id, current_path, navigation_history, active_entity_type, 
                     entity_id, scroll_position, filters, ui_state)
                    VALUES ($1, $2, $3::jsonb, $4, $5, $6::jsonb, $7::jsonb, $8::jsonb)
                    ON CONFLICT (user_id) DO UPDATE
                    SET current_path = EXCLUDED.current_path,
                        navigation_history = EXCLUDED.navigation_history,
                        active_entity_type = EXCLUDED.active_entity_type,
                        entity_id = EXCLUDED.entity_id,
                        scroll_position = EXCLUDED.scroll_position,
                        filters = EXCLUDED.filters,
                        ui_state = EXCLUDED.ui_state,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                    """,
                    user_id,
                    session_data.current_path,
                    navigation_history,
                    session_data.active_entity_type,
                    session_data.active_entity_id,  # Maps to entity_id column
                    json.dumps(session_data.scroll_position) if session_data.scroll_position else '{}',
                    json.dumps(session_data.filters) if session_data.filters else '{}',
                    json.dumps(session_data.ui_state) if session_data.ui_state else '{}',
                )
                
                result = dict(row)                # Convert UUID objects to strings for Pydantic validation
                if "id" in result and result["id"]:
                    result["id"] = str(result["id"])
                if "user_id" in result and result["user_id"]:
                    result["user_id"] = str(result["user_id"])
                if "entity_id" in result and result["entity_id"]:
                    result["entity_id"] = str(result["entity_id"])
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
            
            # Build update values with only provided fields
            current_path = session_update.current_path if session_update.current_path is not None else (current.current_path if current else "/")
            
            navigation_history = json.dumps(
                [entry.model_dump() for entry in session_update.navigation_history]
                if session_update.navigation_history is not None
                else ([entry.model_dump() for entry in current.navigation_history] if current else [])
            )
            
            active_entity_type = session_update.active_entity_type if session_update.active_entity_type is not None else (current.active_entity_type if current else None)
            entity_id = session_update.active_entity_id if session_update.active_entity_id is not None else (current.active_entity_id if current else None)
            scroll_position = session_update.scroll_position if session_update.scroll_position is not None else (current.scroll_position if current else {})
            filters = session_update.filters if session_update.filters is not None else (current.filters if current else {})
            ui_state = session_update.ui_state if session_update.ui_state is not None else (current.ui_state if current else {})
            
            # Upsert (create or update)
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                row = await conn.fetchrow(
                    """
                    INSERT INTO user_session_states 
                    (user_id, current_path, navigation_history, active_entity_type, 
                     entity_id, scroll_position, filters, ui_state)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (user_id) DO UPDATE
                    SET current_path = EXCLUDED.current_path,
                        navigation_history = EXCLUDED.navigation_history,
                        active_entity_type = EXCLUDED.active_entity_type,
                        entity_id = EXCLUDED.entity_id,
                        scroll_position = EXCLUDED.scroll_position,
                        filters = EXCLUDED.filters,
                        ui_state = EXCLUDED.ui_state,
                        updated_at = CURRENT_TIMESTAMP
                    RETURNING *
                    """,
                    user_id,
                    current_path,
                    navigation_history,
                    active_entity_type,
                    entity_id,
                    json.dumps(scroll_position) if scroll_position else '{}',
                    json.dumps(filters) if filters else '{}',
                    json.dumps(ui_state) if ui_state else '{}',
                )
                
                result = dict(row)
                # Convert UUID objects to strings for Pydantic validation
                if "id" in result and result["id"]:
                    result["id"] = str(result["id"])
                if "user_id" in result and result["user_id"]:
                    result["user_id"] = str(result["user_id"])
                if "entity_id" in result and result["entity_id"]:
                    result["entity_id"] = str(result["entity_id"])
                
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
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                await conn.execute(
                    "DELETE FROM user_session_states WHERE user_id = $1",
                    user_id
                )
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
            pool = await get_db_pool()
            async with pool.acquire() as conn:
                result = await conn.execute(
                    """
                    DELETE FROM user_session_states 
                    WHERE updated_at < NOW() - INTERVAL '$1 hours'
                    """,
                    ttl_hours
                )
                # Parse result like "DELETE 5" to get count
                count = int(result.split()[-1]) if result else 0
                logger.info(f"Cleaned up {count} expired session states (TTL: {ttl_hours}h)")
                return count
        except Exception as e:
            logger.error(f"Error cleaning up expired sessions: {e}")
            return 0


# Global instance
session_manager = SessionManager()
