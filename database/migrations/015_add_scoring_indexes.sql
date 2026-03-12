-- Migration 015: Add indexes for project scoring performance
-- Optimizes queries for user_project_qualifications table

-- Index for user-project lookups (used in list_projects)
CREATE INDEX IF NOT EXISTS idx_upq_user_project
ON user_project_qualifications(user_id, project_id);

-- Index for filtering by score (used in sorting by match score)
CREATE INDEX IF NOT EXISTS idx_upq_score
ON user_project_qualifications(qualification_score DESC);

-- Index for cache freshness checks (used in scoring service)
CREATE INDEX IF NOT EXISTS idx_upq_updated
ON user_project_qualifications(updated_at DESC);

-- Composite index for efficient score filtering with user
CREATE INDEX IF NOT EXISTS idx_upq_user_score
ON user_project_qualifications(user_id, qualification_score DESC);

-- Index for finding stale scores that need recalculation
CREATE INDEX IF NOT EXISTS idx_upq_stale_scores
ON user_project_qualifications(user_id, updated_at)
WHERE updated_at < NOW() - INTERVAL '7 days';

-- Add comment for documentation
COMMENT ON INDEX idx_upq_user_project IS 'Fast user-project score lookups';
COMMENT ON INDEX idx_upq_score IS 'Sort projects by match score';
COMMENT ON INDEX idx_upq_updated IS 'Find stale scores for recalculation';
COMMENT ON INDEX idx_upq_user_score IS 'Filter high-scoring projects per user';
