# Feature Specification: UI Routers Improvement

**Feature Branch**: `002-ui-routers-improvement`  
**Created**: January 12, 2026  
**Status**: Draft  
**Input**: User description: "improve UI routers such as settings, keywords etc"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Keywords Management (Priority: P1)

As an auto-bidder user, I need to manage my search keywords so I can filter and discover relevant job opportunities that match my expertise and interests.

**Why this priority**: Keywords are fundamental to job discovery. Without a working keywords interface, users cannot effectively configure the system to find relevant opportunities. This is a core feature that blocks other workflows.

**Independent Test**: Can be fully tested by creating, editing, activating, and deactivating keywords, and verifying that changes persist and affect job discovery behavior.

**Acceptance Scenarios**:

1. **Given** a user navigates to the Keywords page, **When** they view the page, **Then** they see a list of all their keywords with status (active/inactive), match type, and statistics (jobs matched, last match date)
2. **Given** a user wants to add a new keyword, **When** they click "Add Keyword", **Then** a form appears allowing them to enter keyword, description, match type (exact/partial/fuzzy), and set active status
3. **Given** a user has multiple keywords, **When** they search or filter keywords, **Then** the list updates in real-time showing only matching keywords
4. **Given** a user edits an existing keyword, **When** they save changes, **Then** the keyword updates immediately in the list with updated timestamp
5. **Given** a user deactivates a keyword, **When** they toggle the active status, **Then** the keyword is marked inactive and no longer used for job matching, but remains visible in the list
6. **Given** a user views keyword statistics, **When** they see a keyword with high job match count, **Then** they can click to view details of matched jobs or see a summary of performance

---

### User Story 2 - Bidding Strategies Management (Priority: P1)

As an auto-bidder user, I need to create and manage bidding strategies (AI prompt templates) so I can generate proposals with different tones and approaches for different types of projects.

**Why this priority**: Bidding strategies are essential for proposal generation. Users need to configure how the AI generates proposals, making this a core feature that directly impacts the primary value proposition.

**Independent Test**: Can be fully tested by creating strategies with different configurations, setting one as default, using strategies in proposal generation, and verifying that strategy settings affect proposal output.

**Acceptance Scenarios**:

1. **Given** a user navigates to the Strategies page, **When** they view the page, **Then** they see a list of all their bidding strategies with name, tone, usage count, and default indicator
2. **Given** a user wants to create a new strategy, **When** they click "Create Strategy", **Then** a form appears with fields for name, description, system prompt, tone selection, focus areas, temperature, and max tokens
3. **Given** a user has multiple strategies, **When** they set one as default, **Then** that strategy is marked as default and all other strategies are automatically unmarked as default
4. **Given** a user edits a strategy's system prompt, **When** they save changes, **Then** the strategy updates and future proposals using this strategy reflect the new prompt
5. **Given** a user views strategy usage statistics, **When** they see usage count and last used date, **Then** they can identify which strategies are most effective
6. **Given** a user wants to test a strategy, **When** they click "Test Strategy" or "Preview", **Then** they can see a sample proposal generated using that strategy without creating an actual bid

---

### User Story 3 - Knowledge Base Management (Priority: P1)

As an auto-bidder user, I need to upload and manage documents in my knowledge base (case studies, portfolio items, team profiles) so the AI can reference relevant past work when generating proposals.

**Why this priority**: The knowledge base is the foundation of RAG (Retrieval-Augmented Generation). Without documents, proposals cannot cite relevant past work, significantly reducing proposal quality and personalization.

**Independent Test**: Can be fully tested by uploading documents, viewing processing status, organizing documents by collection type, and verifying that uploaded documents are available for proposal generation.

**Acceptance Scenarios**:

1. **Given** a user navigates to the Knowledge Base page, **When** they view the page, **Then** they see a list of all uploaded documents organized by collection (case studies, team profiles, portfolio, other) with processing status, file size, and upload date
2. **Given** a user wants to upload a document, **When** they click "Upload Document", **Then** a file picker appears allowing them to select PDF, DOCX, or TXT files, and they can specify the collection type
3. **Given** a user uploads a document, **When** the upload completes, **Then** the document appears in the list with "processing" status, and they see progress updates until processing completes or fails
4. **Given** a document fails processing, **When** the user views the document, **Then** they see an error message explaining what went wrong and can retry processing or delete the document
5. **Given** a user has multiple documents, **When** they filter by collection type or search by filename, **Then** the list updates to show only matching documents
6. **Given** a user views document statistics, **When** they see retrieval count and last retrieved date, **Then** they understand which documents are most frequently used in proposal generation
7. **Given** a user wants to remove a document, **When** they delete it, **Then** they receive confirmation and the document is removed from both the database and vector store

---

### User Story 4 - Settings Management (Priority: P2)

As an auto-bidder user, I need to configure my account settings, preferences, and platform credentials so the system works according to my preferences and can access external job platforms.

**Why this priority**: Settings enable personalization and platform integration. While important, users can use the system with default settings initially, making this slightly lower priority than core content management features.

**Independent Test**: Can be tested by updating user preferences, configuring platform credentials, changing subscription settings, and verifying that changes persist and affect system behavior.

**Acceptance Scenarios**:

1. **Given** a user navigates to the Settings page, **When** they view the page, **Then** they see organized sections for Profile, Preferences, Platform Credentials, Subscription, and Notifications
2. **Given** a user wants to update preferences, **When** they change default strategy, notification settings, or theme, **Then** changes save automatically and take effect immediately
3. **Given** a user wants to connect a job platform, **When** they navigate to Platform Credentials section, **Then** they can add API keys or OAuth credentials for Upwork, Freelancer, or custom platforms with encrypted storage
4. **Given** a user adds platform credentials, **When** they save credentials, **Then** the system verifies the credentials and displays connection status (connected, failed, expired)
5. **Given** a user views their subscription, **When** they see current tier, usage quota, and billing information, **Then** they can upgrade, manage billing, or view usage history
6. **Given** a user updates any setting, **When** they navigate away and return, **Then** all their settings are preserved and displayed correctly

---

### Edge Cases

- **Empty state handling**: When a user has no keywords, strategies, or documents, the page displays helpful empty states with clear calls-to-action and guidance on how to get started
- **Large datasets**: For users with 100+ keywords or 50+ documents, the interface uses pagination or virtual scrolling to maintain performance, with search and filters to help users find specific items
- **Concurrent edits**: When a user edits a keyword or strategy in one tab and another tab has the same item open, changes sync across tabs or show a conflict resolution dialog
- **File upload failures**: When document upload fails due to network issues, file size limits, or unsupported formats, clear error messages explain the issue and suggest solutions
- **Processing delays**: When document processing takes longer than expected (over 30 seconds), users see progress indicators and can continue working while processing completes in the background
- **Invalid credentials**: When platform credentials are invalid or expired, the system displays clear error messages and provides guidance on how to obtain or refresh credentials
- **Permission errors**: When a user attempts to access settings or features outside their subscription tier, clear upgrade prompts explain the limitation and benefits of upgrading

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: Keywords page MUST display all user keywords with columns for: keyword, description, match type, active status, jobs matched count, last match date, and actions (edit, delete, toggle active)
- **FR-002**: Keywords page MUST provide search functionality to filter keywords by keyword text or description in real-time
- **FR-003**: Keywords page MUST allow users to create new keywords with required fields: keyword (unique per user), optional description, match type (exact/partial/fuzzy), and active status (default: true)
- **FR-004**: Keywords page MUST allow users to edit existing keywords, updating any field including toggling active status
- **FR-005**: Keywords page MUST allow users to delete keywords with confirmation dialog, and deletion MUST remove the keyword from job matching immediately
- **FR-006**: Keywords page MUST preserve filter state, search query, and scroll position when user navigates away and returns
- **FR-007**: Strategies page MUST display all user bidding strategies with columns for: name, description, tone, usage count, default indicator, and actions (edit, delete, set default, test)
- **FR-008**: Strategies page MUST allow users to create new strategies with fields: name (unique per user), description, system prompt (required), tone selection, focus areas (multi-select), temperature (0-2), max tokens (100-4000), and default flag
- **FR-009**: Strategies page MUST enforce that only one strategy per user can be marked as default, automatically unmarking others when a new default is set
- **FR-010**: Strategies page MUST allow users to edit existing strategies, including updating the system prompt which affects future proposal generation
- **FR-011**: Strategies page MUST allow users to delete strategies with confirmation, and deletion MUST prevent the strategy from being used in new proposals (existing proposals retain reference)
- **FR-012**: Strategies page MUST provide a "Test" or "Preview" feature that generates a sample proposal using the selected strategy without creating an actual bid
- **FR-013**: Knowledge Base page MUST display all user documents organized by collection type (case studies, team profiles, portfolio, other) with columns for: filename, collection, file type, file size, processing status, chunk count, retrieval count, upload date, and actions (view, delete, reprocess)
- **FR-014**: Knowledge Base page MUST allow users to upload documents via file picker supporting PDF, DOCX, and TXT formats with maximum file size of 50MB per file
- **FR-015**: Knowledge Base page MUST require users to specify collection type when uploading documents
- **FR-016**: Knowledge Base page MUST display processing status for each document (pending, processing, completed, failed) with progress indicators for in-progress documents
- **FR-017**: Knowledge Base page MUST display error messages when document processing fails, including specific error details and option to retry or delete
- **FR-018**: Knowledge Base page MUST allow users to filter documents by collection type, search by filename, and sort by upload date, file size, or retrieval count
- **FR-019**: Knowledge Base page MUST allow users to delete documents with confirmation, removing from both database and vector store
- **FR-020**: Knowledge Base page MUST display document statistics including retrieval count (how many times used in proposals) and last retrieved date
- **FR-021**: Settings page MUST organize settings into sections: Profile (name, email, avatar), Preferences (default strategy, theme, language, notifications), Platform Credentials (Upwork, Freelancer, custom), Subscription (tier, usage, billing), and Notifications (email, browser, frequency)
- **FR-022**: Settings page MUST allow users to update preferences with immediate effect (no page reload required)
- **FR-023**: Settings page MUST allow users to add, edit, and remove platform credentials with encrypted storage
- **FR-024**: Settings page MUST verify platform credentials when added or updated, displaying connection status (connected, failed, expired) with last verification timestamp
- **FR-025**: Settings page MUST display subscription information including current tier, usage quota (proposals generated vs limit), billing period, and next billing date
- **FR-026**: Settings page MUST allow users to upgrade subscription tier with clear pricing and feature comparison
- **FR-027**: All four pages (Keywords, Strategies, Knowledge Base, Settings) MUST preserve filter state, search queries, and scroll positions using session state management
- **FR-028**: All four pages MUST display loading states with skeletons or spinners while data is being fetched
- **FR-029**: All four pages MUST handle errors gracefully with user-friendly error messages and retry options
- **FR-030**: All four pages MUST follow consistent UI patterns matching existing pages (Projects, Proposals, Analytics) for navigation, filtering, and data display
- **FR-031**: All four pages MUST integrate with navigation timing hooks to measure and track page load performance
- **FR-032**: All four pages MUST support keyboard navigation and accessibility features (ARIA labels, keyboard shortcuts, focus management)

### Key Entities

- **Keyword**: Represents a search term used to filter and discover relevant job opportunities, with configuration for match type and tracking of job matches
- **Bidding Strategy**: Represents a reusable AI prompt template that defines how proposals are generated, including tone, focus areas, and generation parameters
- **Knowledge Base Document**: Represents an uploaded file (PDF, DOCX, TXT) that is processed and indexed for use in RAG-based proposal generation, with metadata about processing status and usage
- **User Settings**: Represents user preferences, platform credentials, and subscription information that configure system behavior and enable external platform integration

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can create a new keyword in under 30 seconds from page load to saved confirmation
- **SC-002**: Users can create a new bidding strategy in under 2 minutes including entering system prompt and configuration
- **SC-003**: Users can upload and process a document (up to 10MB) with processing completing within 60 seconds for 95% of uploads
- **SC-004**: All four pages (Keywords, Strategies, Knowledge Base, Settings) load and display data within 500ms under normal network conditions
- **SC-005**: Users can find any keyword, strategy, or document using search/filter functionality within 3 seconds of entering search query
- **SC-006**: 95% of users successfully complete their first keyword creation, strategy creation, or document upload without requiring help or documentation
- **SC-007**: Zero data loss incidents when users create, edit, or delete keywords, strategies, or documents
- **SC-008**: Users report satisfaction score of 4.0/5.0 or higher for "ease of use" of Keywords, Strategies, and Knowledge Base pages
- **SC-009**: Settings page updates (preference changes, credential updates) take effect immediately for 100% of changes without page reload
- **SC-010**: Document processing success rate is 90% or higher for supported file formats (PDF, DOCX, TXT) under 10MB
- **SC-011**: Users can navigate between Keywords, Strategies, Knowledge Base, and Settings pages while preserving all filter states and scroll positions
- **SC-012**: Support tickets related to "how do I manage keywords/strategies/documents" decrease by 70% after implementation

## Assumptions

1. Users have already completed authentication and have access to the dashboard
2. Database schemas for keywords, bidding_strategies, knowledge_base_documents, and user_profiles already exist and are accessible
3. Backend API endpoints exist or will be created to support CRUD operations for keywords, strategies, documents, and settings
4. File upload infrastructure exists or will be created to handle document uploads with appropriate storage (Supabase Storage or similar)
5. Document processing pipeline exists or will be created to extract text, chunk documents, generate embeddings, and store in vector database
6. Users primarily access via desktop browsers with modern JavaScript support
7. Average document size is under 10MB, with 50MB as maximum supported size
8. Users expect behavior consistent with existing pages (Projects, Proposals, Analytics) for consistency
9. Session state management hooks and navigation timing hooks already exist and can be reused
10. Users may have 10-100 keywords, 5-20 strategies, and 10-50 documents on average
11. Platform credential verification requires external API calls that may take 2-5 seconds
12. Users understand basic concepts of keywords, strategies, and knowledge base from onboarding or documentation

## Dependencies

- Database tables: `keywords`, `bidding_strategies`, `knowledge_base_documents`, `user_profiles`, `platform_credentials` must exist with proper RLS policies
- Backend API endpoints for CRUD operations on all entities
- File upload service for document handling (Supabase Storage or equivalent)
- Document processing service for text extraction and embedding generation
- Vector database (ChromaDB) integration for knowledge base document storage
- Session state management system for preserving filters and scroll positions
- Navigation timing measurement hooks
- UI component library (shadcn/ui) for consistent form inputs, tables, and dialogs

## Out of Scope

- Real-time collaboration features (multiple users editing same keyword/strategy simultaneously)
- Advanced analytics dashboards for keywords/strategies/documents (basic statistics only)
- Bulk import/export functionality for keywords or strategies
- Document versioning or revision history
- Advanced search within document contents (only filename search)
- Integration with external job platforms beyond credential storage (actual API integration is separate feature)
- Mobile-specific optimizations (desktop-first implementation)
- Advanced document processing features (OCR, image extraction, etc.) - basic text extraction only
- Strategy templates marketplace or sharing between users
- Keyword suggestions or auto-generation based on user activity
