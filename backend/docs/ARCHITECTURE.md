# Backend Architecture — High School Website Platform

## Overview

REST API under `/api/v1`, Node.js + Express + MySQL + Prisma (JavaScript).  
Frontend (React + TypeScript) is separate and consumes this API over HTTP/JSON.

## Folder responsibilities

| Path | Responsibility |
|------|----------------|
| `src/config` | Environment, roles/permissions, settings catalog, database client |
| `src/routes` | Public and admin HTTP path mapping |
| `src/controllers` | Request/response orchestration |
| `src/services` | Business logic and Prisma queries |
| `src/middleware` | Auth, authorization, validation, rate limits, logging, errors |
| `src/validators` | Zod schemas |
| `src/utils` | Errors, responses, tokens, soft-delete, media URLs, file signatures |
| `prisma` | Schema and migrations |
| `scripts` | Controlled Super Admin bootstrap |
| `docs` | Architecture, API, deployment, Postman |
| `storage/` | Local media files (gitignored; configurable path) |

Request flow:

`Request → helmet/cors/logger/rate-limit → parse → route → auth?/authorize?/validate → controller → service → Prisma/storage → response / errorHandler`

## Middleware

| Middleware | Role |
|------------|------|
| `helmet` | Security headers (`crossOriginResourcePolicy: cross-origin` for media) |
| `cors` | Explicit origin allowlist (`CORS_ORIGIN`) |
| `requestLogger` | Method, redacted path, status, duration (no bodies/secrets) |
| `apiRateLimiter` | Global API rate limit |
| Module rate limiters | Login, contact, newsletter, admissions, media upload |
| `authenticate` | JWT Bearer + DB admin + `tokenVersion` revocation |
| `authorize` | Central permission checks from `src/config/roles.js` |
| `validate` | Zod body/query/params |
| `errorHandler` | Operational + Prisma mapping; generic 500 in production |

## Standard response format

Success:

```json
{ "success": true, "message": "…", "data": {} }
```

Error:

```json
{ "success": false, "message": "…", "code": "ERROR_CODE", "errors": [] }
```

## Soft delete

Models with `deletedAt` use `notDeleted()` helpers in services. Ordinary list/get queries exclude soft-deleted rows. Restore is Super Admin only where implemented.

`ContactMessage` uses status `ARCHIVED` instead of `deletedAt`.

## Security notes

- Passwords: bcrypt (`bcryptjs`)
- JWT: signed with issuer/audience; revoked via `tokenVersion`
- Uploads: magic-byte validation; random storage keys; path confinement
- Public endpoints never return drafts, deleted rows, or internal settings
- Production startup fails closed on missing JWT/DB/CORS (see [DEPLOYMENT.md](./DEPLOYMENT.md))

## Documentation map

See [API_INDEX.md](./API_INDEX.md) for the full API catalog.
