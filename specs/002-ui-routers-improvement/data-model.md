# Data Model: UI Routers Improvement

**Feature**: 002-ui-routers-improvement  
**Date**: January 12, 2026  
**Database**: PostgreSQL (Supabase)

## Overview

This document defines the database schema for UI routers improvement. **All required tables already exist** from previous migrations:
- `keywords` - from `003_biddinghub_merge.sql`
- `bidding_strategies` - from `001_initial_schema.sql`
- `knowledge_base_documents` - from `003_biddinghub_merge.sql`
- `user_profiles` - from `001_initial_schema.sql`
- `platform_credentials` - from `003_biddinghub_merge.sql`

This document serves as a reference for understanding the existing schema and how it maps to the UI router requirements.

---

## Existing Schema Reference

### Table: `keywords`

**Purpose**: Store user-defined search keywords for job filtering and discovery (FR-001 through FR-006).

**Schema** (from `003_biddinghub_merge.sql`):

```sql
CREATE TABLE keywords (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Keyword Data
  keyword VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Configuration
  is_active BOOLEAN DEFAULT true,
  match_type VARCHAR(20) DEFAULT 'partial' CHECK (match_type IN ('exact', 'partial', 'fuzzy')),
  
  -- Statistics
  jobs_matched INT DEFAULT 0,
  last_match_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes**:
- `idx_keywords_user_id` - Fast user queries
- `idx_keywords_is_active` - Filter active keywords
- `idx_keywords_keyword_lower` - Case-insensitive search
- `idx_keywords_user_keyword` - Unique constraint (user_id, LOWER(keyword))

**RLS Policies**:
- Users can manage own keywords only

**Field Mappings to UI**:

| Field | UI Display | Editable | Validation |
|-------|------------|----------|------------|
| `keyword` | Main keyword text | Yes | Required, 1-255 chars, unique per user |
| `description` | Optional description | Yes | Optional, text |
| `match_type` | Dropdown: exact/partial/fuzzy | Yes | Required, enum |
| `is_active` | Toggle switch | Yes | Boolean, default true |
| `jobs_matched` | Statistics display | No | Auto-incremented |
| `last_match_at` | Statistics display | No | Auto-updated |
| `created_at` | Metadata display | No | Auto-set |
| `updated_at` | Metadata display | No | Auto-updated |

**Validation Rules**:
- Keyword must be unique per user (enforced by unique index)
- Keyword length: 1-255 characters
- Match type must be one of: 'exact', 'partial', 'fuzzy'
- Description is optional

---

### Table: `bidding_strategies`

**Purpose**: Store reusable AI prompt templates for proposal generation (FR-007 through FR-012).

**Schema** (from `001_initial_schema.sql`):

```sql
CREATE TABLE bidding_strategies (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Strategy Definition
  name VARCHAR(255) NOT NULL,
  description TEXT,
  system_prompt TEXT NOT NULL,
  
  -- Style Configuration
  tone VARCHAR(50) DEFAULT 'professional' CHECK (tone IN ('professional', 'enthusiastic', 'technical', 'friendly', 'formal')),
  focus_areas JSONB DEFAULT '[]'::jsonb,
  
  -- Generation Parameters
  temperature DECIMAL(3, 2) DEFAULT 0.7 CHECK (temperature BETWEEN 0 AND 2),
  max_tokens INT DEFAULT 1500 CHECK (max_tokens BETWEEN 100 AND 4000),
  
  -- Usage
  is_default BOOLEAN DEFAULT false,
  use_count INT DEFAULT 0,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes**:
- `idx_strategies_user_id` - Fast user queries
- `idx_strategies_is_default` - Find default strategy
- `idx_strategies_user_default` - Unique constraint (user_id, is_default) WHERE is_default = true
- `idx_strategies_user_name` - Unique constraint (user_id, LOWER(name))

**RLS Policies**:
- Users can manage own strategies only

**Field Mappings to UI**:

| Field | UI Display | Editable | Validation |
|-------|------------|----------|------------|
| `name` | Strategy name | Yes | Required, 1-255 chars, unique per user |
| `description` | Optional description | Yes | Optional, text |
| `system_prompt` | Large text editor | Yes | Required, text |
| `tone` | Dropdown selector | Yes | Required, enum |
| `focus_areas` | Multi-select tags | Yes | Optional, JSONB array |
| `temperature` | Number input (0-2) | Yes | Required, 0-2, default 0.7 |
| `max_tokens` | Number input (100-4000) | Yes | Required, 100-4000, default 1500 |
| `is_default` | Checkbox/radio | Yes | Boolean, only one per user |
| `use_count` | Statistics display | No | Auto-incremented |
| `created_at` | Metadata display | No | Auto-set |
| `updated_at` | Metadata display | No | Auto-updated |

**Validation Rules**:
- Name must be unique per user (enforced by unique index)
- Only one strategy per user can be default (enforced by partial unique index)
- System prompt is required
- Temperature: 0.0 to 2.0 (decimal)
- Max tokens: 100 to 4000 (integer)
- Tone must be one of: 'professional', 'enthusiastic', 'technical', 'friendly', 'formal'
- Focus areas: JSONB array of strings

**Default Strategy Enforcement**:
- When setting a strategy as default, all other user strategies must be unmarked
- Enforced by database trigger or application logic (FR-009)

---

### Table: `knowledge_base_documents`

**Purpose**: Store metadata for uploaded documents used in RAG-based proposal generation (FR-013 through FR-020).

**Schema** (from `003_biddinghub_merge.sql`):

```sql
CREATE TABLE knowledge_base_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- File Information
  filename VARCHAR(500) NOT NULL,
  file_type VARCHAR(10) NOT NULL CHECK (file_type IN ('pdf', 'docx', 'txt')),
  file_size_bytes BIGINT NOT NULL,
  file_url TEXT,
  
  -- Classification
  collection VARCHAR(50) NOT NULL CHECK (collection IN ('case_studies', 'team_profiles', 'portfolio', 'other')),
  
  -- Processing Status
  processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  processing_error TEXT,
  
  -- Embedding Metadata
  chunk_count INT DEFAULT 0,
  token_count INT DEFAULT 0,
  embedding_model VARCHAR(50),
  chroma_collection_name VARCHAR(255),
  
  -- Usage Statistics
  retrieval_count INT DEFAULT 0,
  last_retrieved_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes**:
- `idx_kb_docs_user_id` - Fast user queries
- `idx_kb_docs_collection` - Filter by collection type
- `idx_kb_docs_status` - Filter by processing status
- `idx_kb_docs_uploaded_at` - Sort by upload date

**RLS Policies**:
- Users can manage own documents only

**Field Mappings to UI**:

| Field | UI Display | Editable | Validation |
|-------|------------|----------|------------|
| `filename` | File name | No | Auto-set from upload |
| `file_type` | File type badge | No | Auto-detected |
| `file_size_bytes` | File size (formatted) | No | Auto-calculated |
| `file_url` | Download link | No | Auto-generated (Supabase Storage) |
| `collection` | Collection selector | Yes (on upload) | Required, enum |
| `processing_status` | Status badge | No | Auto-updated |
| `processing_error` | Error message | No | Auto-set on failure |
| `chunk_count` | Statistics display | No | Auto-calculated |
| `token_count` | Statistics display | No | Auto-calculated |
| `retrieval_count` | Statistics display | No | Auto-incremented |
| `last_retrieved_at` | Statistics display | No | Auto-updated |
| `uploaded_at` | Upload date | No | Auto-set |
| `processed_at` | Processing date | No | Auto-set on completion |

**Validation Rules**:
- File type must be one of: 'pdf', 'docx', 'txt'
- File size must be <50MB (enforced in application, not database)
- Collection must be one of: 'case_studies', 'team_profiles', 'portfolio', 'other'
- Processing status must be one of: 'pending', 'processing', 'completed', 'failed'

**Processing Status Flow**:
1. `pending` → Document uploaded, queued for processing
2. `processing` → Currently being processed (text extraction, chunking, embedding)
3. `completed` → Successfully processed and indexed in ChromaDB
4. `failed` → Processing failed (error stored in `processing_error`)

---

### Table: `user_profiles`

**Purpose**: Store user preferences and subscription information (FR-021 through FR-026).

**Schema** (from `001_initial_schema.sql`):

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE NOT NULL,
  
  -- Subscription & Billing
  subscription_tier VARCHAR(20) DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'agency')),
  subscription_status VARCHAR(20) DEFAULT 'active' CHECK (subscription_status IN ('active', 'cancelled', 'expired')),
  subscription_expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Usage Tracking
  usage_quota JSONB DEFAULT '{"proposals_generated": 0, "proposals_limit": 10, "period_start": null}'::jsonb,
  
  -- User Preferences
  preferences JSONB DEFAULT '{
    "default_strategy_id": null,
    "notification_email": true,
    "notification_browser": true,
    "theme": "system",
    "language": "en"
  }'::jsonb,
  
  -- Metadata
  onboarding_completed BOOLEAN DEFAULT false,
  last_activity_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes**:
- `idx_user_profiles_user_id` - Fast user queries
- `idx_user_profiles_subscription` - Filter by subscription tier/status
- `idx_user_profiles_last_activity` - Track user activity

**RLS Policies**:
- Users can view/update own profile only

**Field Mappings to UI**:

| Field | UI Display | Editable | Validation |
|-------|------------|----------|------------|
| `subscription_tier` | Subscription badge | No (upgrade flow) | Enum: free/pro/agency |
| `subscription_status` | Status indicator | No | Enum: active/cancelled/expired |
| `subscription_expires_at` | Expiration date | No | Timestamp |
| `usage_quota` | Usage display | No | JSONB, auto-updated |
| `preferences.default_strategy_id` | Default strategy selector | Yes | UUID reference |
| `preferences.notification_email` | Email notifications toggle | Yes | Boolean |
| `preferences.notification_browser` | Browser notifications toggle | Yes | Boolean |
| `preferences.theme` | Theme selector | Yes | Enum: system/light/dark |
| `preferences.language` | Language selector | Yes | Enum: en/es/fr/etc |
| `onboarding_completed` | Internal flag | No | Boolean |

**Preferences JSONB Schema**:
```json
{
  "default_strategy_id": "uuid or null",
  "notification_email": true,
  "notification_browser": true,
  "theme": "system" | "light" | "dark",
  "language": "en" | "es" | "fr" | ...
}
```

**Usage Quota JSONB Schema**:
```json
{
  "proposals_generated": 0,
  "proposals_limit": 10,
  "period_start": "2026-01-01T00:00:00Z"
}
```

---

### Table: `platform_credentials`

**Purpose**: Store encrypted API credentials for external job platforms (FR-023, FR-024).

**Schema** (from `003_biddinghub_merge.sql`):

```sql
CREATE TABLE platform_credentials (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  
  -- Platform Information
  platform VARCHAR(50) NOT NULL CHECK (platform IN ('upwork', 'freelancer', 'custom')),
  
  -- Credentials (Encrypted via Supabase Vault)
  api_key TEXT,
  api_secret TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_verified_at TIMESTAMP WITH TIME ZONE,
  verification_error TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Indexes**:
- `idx_platform_credentials_user_id` - Fast user queries
- `idx_platform_credentials_platform` - Filter by platform
- `idx_platform_credentials_user_platform` - Unique constraint (user_id, platform)

**RLS Policies**:
- Users can manage own credentials only

**Field Mappings to UI**:

| Field | UI Display | Editable | Validation |
|-------|------------|----------|------------|
| `platform` | Platform selector | Yes (on create) | Required, enum |
| `api_key` | Encrypted input | Yes | Encrypted storage |
| `api_secret` | Encrypted input | Yes | Encrypted storage |
| `access_token` | Encrypted input | Yes | Encrypted storage |
| `refresh_token` | Encrypted input | Yes | Encrypted storage |
| `expires_at` | Expiration date | No | Auto-set from token |
| `is_active` | Active status | No | Auto-updated on verification |
| `last_verified_at` | Last verified date | No | Auto-updated |
| `verification_error` | Error message | No | Auto-set on failure |

**Validation Rules**:
- Platform must be one of: 'upwork', 'freelancer', 'custom'
- Only one credential set per user per platform (enforced by unique index)
- Credentials should be encrypted using Supabase Vault or application-level encryption

**Security Notes**:
- Credentials are sensitive and must be encrypted at rest
- Use Supabase Vault or application-level encryption
- Never log credential values
- Verify credentials on add/update (FR-024)

---

## Data Relationships

```
auth.users (Supabase Auth)
  ├── keywords (1:N)
  ├── bidding_strategies (1:N)
  ├── knowledge_base_documents (1:N)
  ├── user_profiles (1:1)
  └── platform_credentials (1:N)

bidding_strategies
  └── bids (1:N) - Referenced by strategy_id

knowledge_base_documents
  └── ChromaDB (1:N chunks) - Referenced by chroma_collection_name
```

---

## Query Patterns

### Keywords Page

**List Keywords** (with filters):
```sql
SELECT * FROM keywords
WHERE user_id = $1
  AND ($2::text IS NULL OR keyword ILIKE '%' || $2 || '%')
  AND ($3::boolean IS NULL OR is_active = $3)
  AND ($4::text IS NULL OR match_type = $4)
ORDER BY created_at DESC;
```

**Create Keyword**:
```sql
INSERT INTO keywords (user_id, keyword, description, match_type, is_active)
VALUES ($1, $2, $3, $4, $5)
RETURNING *;
```

**Update Keyword**:
```sql
UPDATE keywords
SET keyword = $2, description = $3, match_type = $4, is_active = $5, updated_at = NOW()
WHERE id = $1 AND user_id = $6
RETURNING *;
```

### Strategies Page

**List Strategies**:
```sql
SELECT * FROM bidding_strategies
WHERE user_id = $1
ORDER BY is_default DESC, created_at DESC;
```

**Set Default Strategy** (transaction):
```sql
BEGIN;
  UPDATE bidding_strategies SET is_default = false WHERE user_id = $1;
  UPDATE bidding_strategies SET is_default = true WHERE id = $2 AND user_id = $1;
COMMIT;
```

### Knowledge Base Page

**List Documents** (with filters):
```sql
SELECT * FROM knowledge_base_documents
WHERE user_id = $1
  AND ($2::text IS NULL OR collection = $2)
  AND ($3::text IS NULL OR processing_status = $3)
  AND ($4::text IS NULL OR filename ILIKE '%' || $4 || '%')
ORDER BY uploaded_at DESC;
```

### Settings Page

**Get User Settings**:
```sql
SELECT 
  up.*,
  json_agg(pc.*) FILTER (WHERE pc.id IS NOT NULL) as credentials
FROM user_profiles up
LEFT JOIN platform_credentials pc ON pc.user_id = up.user_id
WHERE up.user_id = $1
GROUP BY up.id;
```

---

## Migration Notes

**No new migrations required** - All tables exist from previous migrations:
- `001_initial_schema.sql` - Created `bidding_strategies`, `user_profiles`
- `003_biddinghub_merge.sql` - Created `keywords`, `knowledge_base_documents`, `platform_credentials`

**Potential Future Enhancements** (not in scope):
- Add indexes for full-text search on keywords
- Add indexes for JSONB queries on preferences
- Add materialized views for statistics aggregation

---

**Data Model Status**: ✅ Complete  
**All required tables exist and are properly indexed**  
**Next Step**: Proceed to API Contracts
