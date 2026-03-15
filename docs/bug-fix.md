# Bug Fix Summary

## 2026-03-15

- Issue: Proposal draft auto-save returned 409 conflict when editing fields like Required Skills.
  Summary: Normalized draft API payload mapping and synced client draft version handling to prevent false version conflicts.

- Issue: AI Generate could change proposal title and weaken project association.
  Summary: Added project-title anchoring for generated titles and a persistent linked-project indicator in the UI.

- Issue: GET /api/drafts/proposal/{id} returned 404 during proposal workflow.
  Summary: This is expected when no draft exists yet; draft data is stored in draft_work, while Save as Draft/Submit writes to proposals.
