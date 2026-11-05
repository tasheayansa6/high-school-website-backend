# Admin Dashboard Statistics API

Base path: `/api/v1/admin/dashboard`

Aggregate website administration statistics for the React admin frontend. Counts are computed live from MySQL via Prisma. Soft-deleted rows are excluded where `deletedAt` exists.

This is **not** a full school MIS/analytics platform.

## Authorization

All endpoints require:

```http
Authorization: Bearer <accessToken>
```

Permission: `dashboard:read`

| Role | Access |
|------|--------|
| Super Admin | Yes (`*`) |
| Content Editor | Yes |
| Communication Manager | Yes |

Unauthenticated → `401`. Missing permission → `403`.

## GET `/overview`

No query parameters.

Returns:

| Section | Fields |
|---------|--------|
| `pages` | `published`, `draft` (non-deleted) |
| `blogPosts` | `published`, `draft` (non-deleted) |
| `contactMessages` | `total` (all rows), `new` (`status = NEW`) |
| `newsletterSubscribers` | `total`, `active`, `pending` (non-deleted) |
| `admissionInquiries` | `total`, `new` (non-deleted; `NEW`) |
| `events` | `upcomingPublished` (`PUBLISHED`, `startsAt >= now`, non-deleted) |
| `mediaAssets` | `total` (non-deleted) |

Contact messages have no soft-delete column; totals include archived messages. “New” uses status `NEW`.

## GET `/recent-activity`

Query: `page` (default 1), `limit` (1–100, default 20).

Newest audit logs first. Each item includes:

- `action`, `entityType`, `entityId`, `createdAt`
- `admin` (`id`, `firstName`, `lastName`, `email`) when available
- Sanitized `metadata` (allowlisted keys only: e.g. `key`, `slug`, `fields`, status transitions). Values such as full messages, emails of subscribers, tokens, or file paths are not exposed.

## GET `/content-statistics`

No query parameters.

Returns grouped counts:

- `pages.byStatus` / `pages.total`
- `blogPosts.byStatus` / `blogPosts.total`
- `blogCategories.total`
- `events.byStatus` / `events.total`

Soft-deleted content excluded. Status keys match Prisma enums (`DRAFT`, `PUBLISHED`, `ARCHIVED`, `CANCELLED`, etc.).

## GET `/inquiry-statistics`

Optional query:

| Param | Description |
|-------|-------------|
| `from` | ISO-8601 lower bound on `createdAt` |
| `to` | ISO-8601 upper bound on `createdAt` |

Rejects invalid dates and ranges where `from > to` (`422`).

Returns aggregate contact and admissions counts by status. No individual inquiry payloads.

Admissions filter excludes soft-deleted inquiries. Contact messages have no `deletedAt`.

## Error codes

`UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`

## Postman sequence

1. Login as Content Editor → `GET .../overview`  
2. Login as Communication Manager → `GET .../inquiry-statistics?from=...&to=...`  
3. `GET .../content-statistics`  
4. `GET .../recent-activity?page=1&limit=5`  
5. Invalid `from`/`to` → `422`  
6. Request without token → `401`  
