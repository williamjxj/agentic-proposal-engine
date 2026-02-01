-- Migration 005: Add missing columns to user_session_states
-- Created: 2026-01-13
-- Description: Add columns that the application code expects but were missing from the initial schema

-- Add current_path column
ALTER TABLE user_session_states
ADD COLUMN IF NOT EXISTS current_path VARCHAR(500) DEFAULT '/';

-- Add active_entity_type column (maps to active_feature in some contexts)
ALTER TABLE user_session_states
ADD COLUMN IF NOT EXISTS active_entity_type VARCHAR(50);

-- Add scroll_position as JSONB (for per-path scroll positions)
ALTER TABLE user_session_states
ADD COLUMN IF NOT EXISTS scroll_position JSONB DEFAULT '{}'::jsonb;

-- Add filters as JSONB (for page filters)
ALTER TABLE user_session_states
ADD COLUMN IF NOT EXISTS filters JSONB DEFAULT '{}'::jsonb;

-- Add ui_state as JSONB (for UI state)
ALTER TABLE user_session_states
ADD COLUMN IF NOT EXISTS ui_state JSONB DEFAULT '{}'::jsonb;

-- Add index for current_path queries
CREATE INDEX IF NOT EXISTS idx_session_states_current_path 
ON user_session_states(current_path);

-- Add index for active_entity_type queries
CREATE INDEX IF NOT EXISTS idx_session_states_active_entity_type 
ON user_session_states(active_entity_type);

-- Update existing rows to have default values
UPDATE user_session_states
SET 
    current_path = COALESCE(current_path, '/'),
    scroll_position = COALESCE(scroll_position, '{}'::jsonb),
    filters = COALESCE(filters, '{}'::jsonb),
    ui_state = COALESCE(ui_state, '{}'::jsonb)
WHERE 
    current_path IS NULL 
    OR scroll_position IS NULL 
    OR filters IS NULL 
    OR ui_state IS NULL;

-- Make current_path NOT NULL after setting defaults
ALTER TABLE user_session_states
ALTER COLUMN current_path SET NOT NULL;

-- Comments
COMMENT ON COLUMN user_session_states.current_path IS 'Current URL path for navigation state tracking';
COMMENT ON COLUMN user_session_states.active_entity_type IS 'Type of currently active entity (e.g., project, proposal, keyword)';
COMMENT ON COLUMN user_session_states.scroll_position IS 'Scroll positions per path (JSONB: {"/path": scrollY})';
COMMENT ON COLUMN user_session_states.filters IS 'Page filters state (JSONB)';
COMMENT ON COLUMN user_session_states.ui_state IS 'UI state (tabs, expanded sections, etc.) (JSONB)';
