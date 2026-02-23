-- Migration 007: Proposals Table
-- Creates proposals table for storing submitted proposal data

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

---
--- TABLE: proposals
---
CREATE TABLE IF NOT EXISTS proposals (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  
  -- Proposal Content
  title VARCHAR(500) NOT NULL,
  description TEXT NOT NULL,
  budget DECIMAL(12, 2), -- Budget in dollars
  timeline VARCHAR(200), -- Timeline description (e.g., "2-3 weeks", "1 month")
  skills TEXT[], -- Array of required skills
  
  -- Job Details
  job_url TEXT, -- Original job posting URL
  job_platform VARCHAR(100), -- Platform name (Upwork, Freelancer, etc.)
  client_name VARCHAR(255),
  
  -- AI Generation Metadata
  strategy_id UUID REFERENCES bidding_strategies(id) ON DELETE SET NULL,
  generated_with_ai BOOLEAN DEFAULT false,
  ai_model_used VARCHAR(100), -- e.g., "gpt-4-turbo", "deepseek-chat"
  
  -- Status & Lifecycle
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'accepted', 'rejected', 'withdrawn')),
  submitted_at TIMESTAMP WITH TIME ZONE,
  response_at TIMESTAMP WITH TIME ZONE,
  
  -- Analytics
  view_count INT DEFAULT 0,
  revision_count INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for proposals
CREATE INDEX idx_proposals_user_id ON proposals(user_id);
CREATE INDEX idx_proposals_status ON proposals(status);
CREATE INDEX idx_proposals_created_at ON proposals(created_at DESC);
CREATE INDEX idx_proposals_user_status ON proposals(user_id, status);

-- Updated Timestamp Trigger for proposals
CREATE TRIGGER update_proposals_updated_at
  BEFORE UPDATE ON proposals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments
COMMENT ON TABLE proposals IS 'Stores user-created proposals for freelance jobs';
COMMENT ON COLUMN proposals.status IS 'draft: Being edited, submitted: Sent to client, accepted: Client accepted, rejected: Client rejected, withdrawn: User withdrew';
COMMENT ON COLUMN proposals.budget IS 'Proposed budget in USD';
COMMENT ON COLUMN proposals.timeline IS 'Human-readable timeline estimate';
