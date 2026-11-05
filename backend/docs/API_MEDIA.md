# Media Library & File Upload API

Base path: `/api/v1`

Secure image/document uploads for the school website. Local filesystem storage in development; MySQL stores metadata only.

## Supported formats

| MIME | Extension | Notes |
|------|-----------|-------|
| `image/jpeg` | `.jpg` | Detected by magic bytes |
| `image/png` | `.png` | Detected by magic bytes |
| `image/webp` | `.webp` | Detected by magic bytes |
| `application/pdf` | `.pdf` | Allowed for school circulars/forms |

Client-supplied MIME type and extension are **not** trusted. Actual file content is validated.

Default max size: **5 MB** (`MEDIA_MAX_FILE_SIZE_BYTES`).

## Storage configuration

| Variable | Purpose |
|----------|---------|
| `MEDIA_STORAGE_PATH` | Absolute/relative directory for files (default `./storage/uploads`) |
| `MEDIA_MAX_FILE_SIZE_BYTES` | Max upload size in bytes |
| `MEDIA_PUBLIC_BASE_URL` | Base URL used when building public media URLs |
| `MEDIA_RATE_LIMIT_WINDOW_MS` | Upload rate-limit window |
| `MEDIA_RATE_LIMIT_MAX` | Max uploads per window (default 30) |

Files are stored **outside** `src/` with cryptographically random names (`YYYY/MM/<random>.<ext>`). Original filenames are kept only as metadata.

The storage service is isolated so another provider can replace the local adapter later without rewriting media business logic.

## Authorization

| Action | Who |
|--------|-----|
| Upload / list / view / update / soft-delete | Super Admin, Content Editor (`media:manage`) |
| Restore | Super Admin only (`media:restore`) |
| Communication Manager | Denied |
| Public content stream | No auth |

## Upload

### POST `/api/v1/admin/media/upload`

`multipart/form-data`

| Field | Required | Description |
|-------|----------|-------------|
| `file` | Yes | Binary file |
| `altText` | No | Alt text (max 255) |
| `description` | No | Description (max 500) |
| `isGalleryImage` | No | `true` / `false` |
| `sortOrder` | No | Integer sort hint |

Success `201`:

```json
{
  "success": true,
  "message": "Media uploaded successfully",
  "data": {
    "media": {
      "id": 1,
      "fileName": "a1b2c3....png",
      "originalName": "campus.png",
      "mimeType": "image/png",
      "fileSize": 1234,
      "altText": "Campus entrance",
      "description": null,
      "isGalleryImage": false,
      "sortOrder": 0,
      "url": "http://localhost:5000/api/v1/media/1/content",
      "createdAt": "..."
    }
  }
}
```

Internal `storagePath` is never returned.

## Administrator library

- `GET /api/v1/admin/media` — `page`, `limit`, `q`, `mimeType`, `isGalleryImage`, `sortOrder`, `includeDeleted`
- `GET /api/v1/admin/media/:id`
- `PATCH /api/v1/admin/media/:id` — `altText`, `description`, `isGalleryImage`, `sortOrder`
- `DELETE /api/v1/admin/media/:id` — soft-delete (file kept for restore)
- `PATCH /api/v1/admin/media/:id/restore` — Super Admin

### Deletion safety

Soft-delete is **blocked** (`409 MEDIA_IN_USE`) when any non-deleted blog post or event still references the asset as a featured image. References are not silently cleared. Physical files are not removed while soft-deleted (supports restore).

## Public retrieval

### GET `/api/v1/media/:id/content`

Streams the binary for a non-deleted asset with the correct `Content-Type`. Missing or deleted assets return `404`. Path traversal is not possible because lookup is by numeric id + resolved storage key confined to `MEDIA_STORAGE_PATH`.

Blog and event featured-image payloads expose `url` pointing at this endpoint.

## Error codes

`FILE_REQUIRED`, `UNSUPPORTED_FILE_TYPE`, `FILE_TOO_LARGE`, `MEDIA_NOT_FOUND`, `MEDIA_IN_USE`, `MEDIA_NOT_DELETED`, `STORAGE_WRITE_FAILED`, `MEDIA_PERSIST_FAILED`, `UNAUTHORIZED`, `FORBIDDEN`, `VALIDATION_ERROR`, `MEDIA_RATE_LIMIT_EXCEEDED`

## Postman sequence

1. Login as Content Editor
2. `POST /admin/media/upload` with form-data `file` (PNG/JPEG)
3. Copy `data.media.url` → open in browser / GET without auth
4. `GET /admin/media`, search/filter, `PATCH` metadata
5. Attach media id as blog/event `featuredImageId`, publish, confirm `DELETE` returns `409`
6. Detach reference, soft-delete, confirm public content `404`
7. Super Admin restore; Communication Manager gets `403` on admin media routes
