# School Events Management API

Base path: `/api/v1`

Event publishing and management for the public website. This is **not** a timetable, attendance, or notification system.

## Supported statuses

| Status | Meaning |
|--------|---------|
| `DRAFT` | Editable, not public (default for new events) |
| `PUBLISHED` | Visible on public endpoints |
| `CANCELLED` | Marked cancelled; not public |
| `ARCHIVED` | Reserved status value; soft-delete uses `deletedAt` |

## Publication workflow

`DRAFT` → edit → `publish` → `PUBLISHED` → `unpublish` → `DRAFT` → edit → `publish`

Cancellation: `PATCH .../cancel` sets `CANCELLED` (hidden from public). Unpublish returns a cancelled event to `DRAFT` before it can be published again.

Soft-delete sets `deletedAt` and moves status to `DRAFT`. Soft-deleted events are excluded from ordinary public and admin listings. Only Super Admin can restore.

Ordinary `PATCH` content updates never change publication status.

## Date and timezone behavior

- Accept ISO-8601 date-time strings (e.g. `2026-12-01T09:00:00.000Z`).
- Values are stored via Prisma/MySQL without application-side timezone rewriting.
- `endsAt` is optional; when present it must not be earlier than `startsAt`.
- Upcoming/past filters compare `startsAt` to the server clock at request time.

## Schema notes

Migration `20261105120000_event_slug_publish_media` adds:

- `slug` (unique) for public URLs
- `published_at` for first-publish metadata
- `featured_image_id` → optional `MediaAsset` (validated; uploads are a later phase)

## Public endpoints

No authentication.

### GET `/api/v1/events`

Returns **published**, non-deleted events only.

| Query | Description |
|-------|-------------|
| `page` | Page number (default 1) |
| `limit` | 1–100 (default 20) |
| `q` | Search title or slug |
| `timeframe` | `upcoming` \| `past` |
| `startsFrom` | ISO lower bound on `startsAt` |
| `startsTo` | ISO upper bound on `startsAt` |

Upcoming sorts by `startsAt` ascending; past sorts descending.

### GET `/api/v1/events/:slug`

Returns one published event, including featured image metadata when present. Drafts, cancelled, deleted, and missing slugs return `404`.

Public payloads omit administrator fields (`status`, `createdBy`, `deletedAt`).

## Administrator endpoints

```http
Authorization: Bearer <accessToken>
```

| Action | Who |
|--------|-----|
| List / create / update / publish / unpublish / cancel / soft-delete | Super Admin, Content Editor (`events:manage`) |
| Restore | Super Admin only (`events:restore`) |
| Communication Manager | Denied |

### GET `/api/v1/admin/events`

Query: `page`, `limit`, `q`, `status`, `timeframe`, `startsFrom`, `startsTo`, `sortBy` (`startsAt`\|`createdAt`\|`updatedAt`\|`publishedAt`\|`title`), `sortOrder` (`asc`\|`desc`), `includeDeleted`.

### POST `/api/v1/admin/events`

```json
{
  "title": "Science Fair",
  "slug": "science-fair-2026",
  "description": "Annual student science exhibition.",
  "location": "Main Hall",
  "startsAt": "2026-12-01T09:00:00.000Z",
  "endsAt": "2026-12-01T16:00:00.000Z",
  "featuredImageId": null
}
```

Creates a `DRAFT`. Slug is auto-generated from title when omitted.

### GET `/api/v1/admin/events/:id`

### PATCH `/api/v1/admin/events/:id`

Content fields only (no status).

### PATCH `/api/v1/admin/events/:id/publish`

### PATCH `/api/v1/admin/events/:id/unpublish`

### PATCH `/api/v1/admin/events/:id/cancel`

### DELETE `/api/v1/admin/events/:id`

### PATCH `/api/v1/admin/events/:id/restore`

## Error responses

```json
{
  "success": false,
  "message": "Human-readable message",
  "code": "ERROR_CODE",
  "errors": []
}
```

Common codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `EVENT_NOT_FOUND`, `EVENT_SLUG_CONFLICT`, `MEDIA_NOT_FOUND`, `EVENT_CANCELLED`, `EVENT_NOT_DELETED`.

## Postman testing sequence

1. Login as Content Editor
2. `POST /api/v1/admin/events` → draft
3. `PATCH .../:id` update title/description/dates
4. `PATCH .../:id/publish`
5. `GET /api/v1/events` and `GET /api/v1/events/:slug` without auth
6. Confirm draft events are absent from public list
7. Filter public list with `timeframe=upcoming` and date range
8. `PATCH .../:id/unpublish` then confirm public `404`
9. Republish, then `PATCH .../:id/cancel`
10. Soft-delete; confirm Communication Manager gets `403` on admin routes
11. Super Admin restore
