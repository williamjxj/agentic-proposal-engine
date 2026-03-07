-- Migration 008: Jobs, ETL Runs, User Job Status
-- Created: 2026-03-06
-- Description: ETL persistence for Projects page - jobs table, etl_runs audit, user_job_status
-- Reference: docs/todos/autobidder-etl-rag-schema-spec.md, specs/003-projects-etl-persistence/data-model.md

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- ENUMS (create only if not exists)
-- ============================================================

DO $$ BEGIN
    CREATE TYPE job_platform AS ENUM (
        'upwork', 'freelancer', 'linkedin', 'toptal', 'guru',
        'remoteok', 'remotive', 'huggingface_dataset', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE job_category AS ENUM (
        'ai_ml', 'web_development', 'fullstack_engineering',
        'devops_mlops', 'cloud_infrastructure',
        'software_outsourcing', 'ui_design', 'other'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
    CREATE TYPE job_status AS ENUM (
        'new', 'matched', 'archived', 'expired'
    );
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- JOBS (Core table — fed by ETL)
-- ============================================================

CREATE TABLE IF NOT EXISTS jobs (
    id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Source identity
    platform          job_platform NOT NULL,
    external_id       TEXT NOT NULL,
    external_url      TEXT,
    fingerprint_hash  TEXT NOT NULL UNIQUE,

    -- Categorization
    category          job_category NOT NULL,
    subcategory       TEXT,

    -- Content
    title             TEXT NOT NULL,
    description       TEXT NOT NULL,
    skills_required   TEXT[] DEFAULT ARRAY[]::TEXT[],

    -- Budget
    budget_min        NUMERIC(12,2),
    budget_max        NUMERIC(12,2),
    budget_currency   CHAR(3) DEFAULT 'USD',

    -- Employer
    employer_name     TEXT,

    -- ETL metadata
    status            job_status DEFAULT 'new',
    etl_source        TEXT,
    raw_payload       JSONB,

    -- Timestamps
    posted_at         TIMESTAMPTZ,
    scraped_at        TIMESTAMPTZ DEFAULT NOW(),
    created_at        TIMESTAMPTZ DEFAULT NOW(),
    updated_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_jobs_platform ON jobs(platform);
CREATE INDEX IF NOT EXISTS idx_jobs_category ON jobs(category);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_posted_at ON jobs(posted_at DESC);
CREATE INDEX IF NOT EXISTS idx_jobs_fingerprint ON jobs(fingerprint_hash);
CREATE INDEX IF NOT EXISTS idx_jobs_skills ON jobs USING GIN(skills_required);
CREATE INDEX IF NOT EXISTS idx_jobs_fulltext ON jobs USING GIN(to_tsvector('english', title || ' ' || description));

-- ============================================================
-- ETL RUNS (Audit trail)
-- ============================================================

CREATE TABLE IF NOT EXISTS etl_runs (
    id              SERIAL PRIMARY KEY,
    source          TEXT NOT NULL,
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    status          TEXT,
    jobs_extracted  INT DEFAULT 0,
    jobs_filtered   INT DEFAULT 0,
    jobs_inserted   INT DEFAULT 0,
    jobs_updated    INT DEFAULT 0,
    error_message   TEXT,
    metadata        JSONB
);

CREATE INDEX IF NOT EXISTS idx_etl_runs_source ON etl_runs(source);
CREATE INDEX IF NOT EXISTS idx_etl_runs_started_at ON etl_runs(started_at DESC);

-- ============================================================
-- USER JOB STATUS (Per-user pipeline: reviewed, applied)
-- ============================================================

CREATE TABLE IF NOT EXISTS user_job_status (
    id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id     UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    job_id      UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
    status      VARCHAR(20) NOT NULL CHECK (status IN ('reviewed', 'applied', 'won', 'lost', 'archived')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_user_job_status_user_id ON user_job_status(user_id);
CREATE INDEX IF NOT EXISTS idx_user_job_status_job_id ON user_job_status(job_id);
CREATE INDEX IF NOT EXISTS idx_user_job_status_status ON user_job_status(status);

-- Trigger for updated_at (drop first for idempotency)
DROP TRIGGER IF EXISTS update_jobs_updated_at ON jobs;
CREATE TRIGGER update_jobs_updated_at
    BEFORE UPDATE ON jobs
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_user_job_status_updated_at ON user_job_status;
CREATE TRIGGER update_user_job_status_updated_at
    BEFORE UPDATE ON user_job_status
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE jobs IS 'Job postings from ETL (HuggingFace, future scrapers)';
COMMENT ON TABLE etl_runs IS 'Audit trail for ETL executions';
COMMENT ON TABLE user_job_status IS 'Per-user pipeline status (reviewed, applied, won, lost)';
