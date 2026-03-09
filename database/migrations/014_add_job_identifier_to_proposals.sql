-- Migration 014: Add job_identifier to proposals for tracking draft/submitted by job id
-- Enables "already applied" check for both persisted projects (UUID) and HF jobs (hash ids)

ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS job_identifier VARCHAR(255);

CREATE INDEX IF NOT EXISTS idx_proposals_job_identifier ON proposals(job_identifier) WHERE job_identifier IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_proposals_user_job_identifier ON proposals(user_id, job_identifier) WHERE job_identifier IS NOT NULL;

COMMENT ON COLUMN proposals.job_identifier IS 'Job id from client (UUID or hash). Enables duplicate-apply prevention for HF jobs.';
