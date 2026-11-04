# Backend Architecture — High School Website Platform

## Overview

REST API under `/api/v1`, Node.js + Express + MySQL + Prisma (JavaScript).

Phase 4 establishes shared architecture only. Business modules (auth, blog, contact, etc.) are not implemented yet.

## Folder responsibilities

| Path | Responsibility |
|------|----------------|
| `src/config` | Environment and database client |
| `src/routes` | Route mounting and HTTP path mapping |
| `src/controllers` | Request/response orchestration |
| `src/services` | Business logic and Prisma queries (future modules) |
| `src/middleware` | Cross-cutting HTTP concerns |
| `src/validators` | Zod schemas for bodies, params, and query |
| `src/utils` | Errors, responses, soft-delete helpers, async wrapper |
| `prisma` | Schema and migrations |

Request flow:

`Request -> security/logging middleware -> route -> validate -> controller -> service -> Prisma -> response / errorHandler`

## Middleware

| Middleware | Role |
|------------|------|
| `helmet` | HTTP security headers |
| `cors` | Origin allowlist from `CORS_ORIGIN` |
| `requestLogger` | Method, path, status, duration, timestamp (no bodies/secrets) |
| `apiRateLimiter` | Basic request rate limiting |
| `express.json` / `urlencoded` | Body parsing with size limit |
| `validate` | Zod validation for body, query, or params |
| `notFound` | Unknown routes -> 404 |
| `errorHandler` | Centralized operational and Prisma errors |

## API versioning

All public endpoints are mounted under `/api/v1`.

Current endpoints:

- `GET /api/v1/health`
- `POST /api/v1/system/validate-example` (architecture smoke test for validation)

## Standard response format

Success:

```json
{
  "success": true,
  "message": "Human-readable message",
  "data": {}
}
```

Error:

```json
{
  "success": false,
  "message": "Human-readable message",
  "code": "ERROR_CODE",
  "errors": [
    { "field": "name", "message": "name is required" }
  ]
}
```

`errors` appears for validation failures. `data` may appear on selected errors (for example health when the database is down).

## Error handling conventions

| Situation | Status | Typical code |
|-----------|--------|--------------|
| Validation failure | 422 | `VALIDATION_ERROR` |
| Route not found | 404 | `ROUTE_NOT_FOUND` |
| Unauthorized (future) | 401 | `UNAUTHORIZED` |
| Forbidden / CORS denied | 403 | `CORS_DENIED` / `FORBIDDEN` |
| Conflict (unique/FK) | 409 | `UNIQUE_CONSTRAINT` / `FOREIGN_KEY_CONSTRAINT` |
| Database unavailable | 503 | `DATABASE_UNAVAILABLE` |
| Unexpected failure | 500 | `INTERNAL_SERVER_ERROR` |

Production responses never include stack traces, passwords, or database credentials.

## Soft-delete handling

Models with `deletedAt`: Admin, Page, BlogCategory, BlogPost, Event, MediaAsset.

Use helpers in `src/utils/softDelete.js`:

- `notDeleted(where)` — ordinary queries exclude deleted rows
- `withSoftDeleteFilter(where, { includeDeleted: true })` — authorized recovery/admin flows

No global Prisma extension is installed. Services must apply these helpers explicitly.

Limitation: forgetting the helper can return soft-deleted rows. Keep soft-delete filtering inside services.

## CORS configuration

Set `CORS_ORIGIN` to a comma-separated allowlist, for example:

```env
CORS_ORIGIN=http://localhost:5173,https://school.example.com
```

In production, `*` or an empty allowlist causes startup failure.

## Environment variables

See `.env.example` for:

- `NODE_ENV`, `PORT`
- `CORS_ORIGIN`
- `BODY_LIMIT`
- `RATE_LIMIT_WINDOW_MS`, `RATE_LIMIT_MAX`
- MySQL / Prisma database variables

## Related docs

- [DATABASE.md](./DATABASE.md)
- [database-erd.md](./database-erd.md)
