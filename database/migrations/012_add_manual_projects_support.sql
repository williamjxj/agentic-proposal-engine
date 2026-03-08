-- Migration 012: Add Manual Projects Support
-- Created: 2026-03-07
-- Description: Add test_email column and 'manual' platform to projects

-- Add 'manual' to job_platform enum (if it doesn't exist)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type t JOIN pg_enum e ON t.oid = e.enumtypid WHERE t.typname = 'job_platform' AND e.enumlabel = 'manual') THEN
        ALTER TYPE job_platform ADD VALUE 'manual';
    END IF;
END $$;

-- Add test_email column to projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS test_email TEXT;

COMMENT ON COLUMN projects.test_email IS 'Test email for manual/mock projects used in testing';
