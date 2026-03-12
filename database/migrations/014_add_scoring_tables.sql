-- Migration 014: Add Project Scoring Tables
-- Created: 2026-01-14
-- Description: Tables for project scoring and user keywords

---
--- TABLE: user_keywords
--- Stores user skills, interests, and preferences for project matching
---
CREATE TABLE IF NOT EXISTS user_keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  keyword VARCHAR(255) NOT NULL,
  weight FLOAT DEFAULT 1.0,
  category VARCHAR(50) DEFAULT 'skill', -- 'skill', 'interest', 'domain', 'tool', 'language'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_keyword UNIQUE(user_id, keyword)
);

-- Indexes for user_keywords
CREATE INDEX idx_user_keywords_user_id ON user_keywords(user_id);
CREATE INDEX idx_user_keywords_keyword ON user_keywords(keyword);
CREATE INDEX idx_user_keywords_category ON user_keywords(category);

---
--- TABLE: user_project_qualifications
--- Stores calculated match scores between users and projects
---
CREATE TABLE IF NOT EXISTS user_project_qualifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  qualification_score FLOAT NOT NULL CHECK (qualification_score >= 0 AND qualification_score <= 100),
  qualification_reason TEXT,
  score_details JSONB DEFAULT '{}'::jsonb, -- Breakdown: skill_match, semantic_sim, etc.
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT unique_user_project_qualification UNIQUE(user_id, project_id)
);

-- Indexes for user_project_qualifications
CREATE INDEX idx_upq_user_id ON user_project_qualifications(user_id);
CREATE INDEX idx_upq_project_id ON user_project_qualifications(project_id);
CREATE INDEX idx_upq_score ON user_project_qualifications(qualification_score DESC);
CREATE INDEX idx_upq_updated ON user_project_qualifications(updated_at);

-- Comments
COMMENT ON TABLE user_keywords IS 'User skills and preferences for project matching';
COMMENT ON TABLE user_project_qualifications IS 'Calculated match scores between users and projects';
COMMENT ON COLUMN user_project_qualifications.score_details IS 'JSON breakdown of score components: skill_match, semantic_similarity, title_match, description_density, tfidf_match, budget_alignment';
