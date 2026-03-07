-- Migration 009: Add job_id to proposals (FR-010)
-- Links proposals to persisted jobs for traceability
-- Reference: specs/003-projects-etl-persistence/spec.md

-- Add nullable job_id column (jobs table from 008 must exist)
ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS job_id UUID REFERENCES jobs(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_proposals_job_id ON proposals(job_id);

COMMENT ON COLUMN proposals.job_id IS 'Links proposal to persisted job from Projects page (FR-010)';
