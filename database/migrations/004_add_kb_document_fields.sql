---
--- Migration: Add Contact and Reference Fields to Knowledge Base Documents
--- Date: 2026-03-08
--- Description: Adds optional contact, reference fields, and title for better document metadata
---

-- Add new fields to knowledge_base_documents table
ALTER TABLE knowledge_base_documents
  ADD COLUMN IF NOT EXISTS title VARCHAR(200),
  ADD COLUMN IF NOT EXISTS reference_url TEXT,
  ADD COLUMN IF NOT EXISTS email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS contact_url TEXT;

-- Add indexes for searchable fields
CREATE INDEX IF NOT EXISTS idx_kb_docs_title ON knowledge_base_documents(title);
CREATE INDEX IF NOT EXISTS idx_kb_docs_email ON knowledge_base_documents(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_kb_docs_phone ON knowledge_base_documents(phone) WHERE phone IS NOT NULL;

-- Add comments
COMMENT ON COLUMN knowledge_base_documents.title IS 'Document title (defaults to filename without extension)';
COMMENT ON COLUMN knowledge_base_documents.reference_url IS 'Optional reference URL (company website, LinkedIn, GitHub, etc.)';
COMMENT ON COLUMN knowledge_base_documents.email IS 'Optional contact email extracted or entered';
COMMENT ON COLUMN knowledge_base_documents.phone IS 'Optional contact phone extracted or entered';
COMMENT ON COLUMN knowledge_base_documents.contact_url IS 'Optional contact URL (LinkedIn profile, personal website, etc.)';

-- Note: supplemental_info is NOT stored in DB - it's embedded with the document chunks in ChromaDB
