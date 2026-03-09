-- Migration: Add recipient_email column to proposals table
-- This stores the email address where the proposal was/will be sent

ALTER TABLE proposals
ADD COLUMN IF NOT EXISTS recipient_email VARCHAR(255);

-- Add comment
COMMENT ON COLUMN proposals.recipient_email IS 'Email address of the recipient (customer) for this proposal';
