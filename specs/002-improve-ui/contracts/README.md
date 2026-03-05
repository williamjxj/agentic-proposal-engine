# Contracts: Improve the UI (002-improve-ui)

**Branch**: `002-improve-ui` | **Scope**: Frontend only

## No New API Contracts

This feature does not introduce new backend endpoints or change existing API contracts. The frontend continues to use the same endpoints:

- **Auth**: `POST /api/auth/login`, `POST /api/auth/signup`
- **Projects**: `GET /api/projects/jobs`, `GET /api/projects/stats`, etc.
- **Proposals**: `GET/POST /api/proposals`, `POST /api/proposals/generate-from-job`
- **Knowledge Base**: `GET/POST /api/knowledge-base/documents`
- **Strategies**: `GET/POST /api/strategies`
- **Keywords**: `GET /api/keywords`
- **Analytics**: `GET /api/analytics`

See [001-auto-bidder-improvements/contracts/](../001-auto-bidder-improvements/contracts/) for existing API specifications.

## Demo User

The demo user (`jxjwilliam@2925.com`) must already exist in the auth system. The frontend calls the existing login endpoint with demo credentials. No backend changes required.
