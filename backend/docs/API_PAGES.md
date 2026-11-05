# Pages API — Frontend Integration

Base path: `/api/v1`

Authentication for admin routes:

```http
Authorization: Bearer <accessToken>
```

Authorized roles for page management: **Super Admin** and **Content Editor** (`pages:manage`).  
Page restoration requires **Super Admin** (`pages:restore` via `*`).

## Publication workflow

1. Create page → status `DRAFT`
2. Edit title/slug/content as needed (status unchanged)
3. Publish → status `PUBLISHED`, `publishedAt` set (if empty)
4. Unpublish → status `DRAFT` (hidden from public API)
5. Soft delete → `deletedAt` set, status forced to `DRAFT`
6. Restore (Super Admin) → clears `deletedAt`

Public endpoints never return draft, archived, or soft-deleted pages.

## Public endpoints

### GET `/api/v1/pages`

Query:

| Param | Default | Notes |
|-------|---------|-------|
| page | 1 | >= 1 |
| limit | 20 | 1–100 |

Success `200`:

```json
{
  "success": true,
  "message": "Published pages retrieved",
  "data": {
    "items": [
      {
        "id": 1,
        "title": "About Our School",
        "slug": "about-our-school",
        "content": "<p>...</p>",
        "publishedAt": "2026-11-04T10:00:00.000Z",
        "updatedAt": "2026-11-04T10:00:00.000Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 1,
      "totalPages": 1
    }
  }
}
```

### GET `/api/v1/pages/:slug`

Success `200`:

```json
{
  "success": true,
  "message": "Page retrieved",
  "data": {
    "page": {
      "id": 1,
      "title": "About Our School",
      "slug": "about-our-school",
      "content": "<p>...</p>",
      "publishedAt": "2026-11-04T10:00:00.000Z",
      "updatedAt": "2026-11-04T10:00:00.000Z"
    }
  }
}
```

Errors: `404 PAGE_NOT_FOUND` for missing, unpublished, or deleted pages.

## Administrator endpoints

### GET `/api/v1/admin/pages`

Query: `page`, `limit`, `status` (`DRAFT|PUBLISHED|ARCHIVED`), `q`, `sortBy`, `sortOrder`, `includeDeleted`

### GET `/api/v1/admin/pages/search?q=admissions`

Same pagination/filter fields; `q` is required.

### POST `/api/v1/admin/pages`

```json
{
  "title": "Admissions",
  "slug": "admissions",
  "content": "<p>How to apply</p>"
}
```

`slug` is optional; generated from `title` when omitted.  
Creates as `DRAFT`. Success `201`.

### GET `/api/v1/admin/pages/:id`

Optional query: `includeDeleted=true`

### PATCH `/api/v1/admin/pages/:id`

```json
{
  "title": "Admissions Overview",
  "content": "<p>Updated content</p>"
}
```

Does not change publication status.

### PATCH `/api/v1/admin/pages/:id/publish`

Requires non-empty content. Error `422 PAGE_CONTENT_REQUIRED` when incomplete.

### PATCH `/api/v1/admin/pages/:id/unpublish`

### DELETE `/api/v1/admin/pages/:id`

Soft delete.

### PATCH `/api/v1/admin/pages/:id/restore`

Super Admin only.

## Common errors

| Status | Code | Meaning |
|--------|------|---------|
| 401 | `UNAUTHORIZED` | Missing/invalid token |
| 403 | `FORBIDDEN` | Role lacks permission |
| 404 | `PAGE_NOT_FOUND` | Page unavailable |
| 409 | `SLUG_CONFLICT` | Duplicate slug |
| 422 | `VALIDATION_ERROR` | Invalid validation |
| 422 | `PAGE_CONTENT_REQUIRED` | Publish without content |

## Admin page object

```json
{
  "id": 1,
  "title": "Admissions",
  "slug": "admissions",
  "content": "<p>...</p>",
  "status": "DRAFT",
  "publishedAt": null,
  "deletedAt": null,
  "createdAt": "...",
  "updatedAt": "...",
  "createdById": 1,
  "updatedById": 1,
  "createdBy": { "id": 1, "firstName": "Site", "lastName": "Admin", "email": "admin@example.com" },
  "updatedBy": { "id": 1, "firstName": "Site", "lastName": "Admin", "email": "admin@example.com" }
}
```
