# Admissions Inquiry Management API

Base path: `/api/v1`

Inquiry inbox for prospective students and guardians. This is **not** a full enrollment, exam, fee, or document-verification system.

## Supported statuses

| Status | Meaning |
|--------|---------|
| `NEW` | Just submitted (default) |
| `CONTACTED` | School has reached out |
| `UNDER_REVIEW` | Being reviewed by admissions staff |
| `CLOSED` | Inquiry closed |

Soft deletion uses `deletedAt`. Soft-deleted inquiries are excluded from ordinary inbox listings and can be restored by Super Admin only.

## Public submission

### POST `/api/v1/admissions/inquiries`

No authentication required. Rate limited (`ADMISSIONS_RATE_LIMIT_MAX`, default 5 per 15 minutes).

Request:

```json
{
  "studentName": "Abebe Kebede",
  "guardianName": "Kebede Alemu",
  "email": "parent@example.com",
  "phone": "+251 911 000 000",
  "gradeApplyingFor": "Grade 9",
  "academicYear": "2026/2027",
  "message": "We would like information about admission requirements."
}
```

| Field | Required | Rules |
|-------|----------|-------|
| `studentName` | Yes | 1–150 characters, trimmed |
| `guardianName` | No | Max 150 characters; empty becomes `null` |
| `email` | Yes | Valid email, normalized to lowercase, max 255 |
| `phone` | Yes | International-friendly: digits/`+`/`-`/`()`/spaces/dots; 7–15 digits after stripping non-digits; max 50 chars |
| `gradeApplyingFor` | Yes | 1–50 characters |
| `academicYear` | Yes | 1–20 characters |
| `message` | Yes | 1–5000 characters, trimmed |

Unsupported fields are rejected (`strict` body schema).

Success `201`:

```json
{
  "success": true,
  "message": "Admission inquiry submitted successfully",
  "data": {
    "submission": {
      "id": 1,
      "studentName": "Abebe Kebede",
      "email": "parent@example.com",
      "gradeApplyingFor": "Grade 9",
      "academicYear": "2026/2027",
      "status": "NEW",
      "createdAt": "2026-11-05T08:00:00.000Z"
    }
  }
}
```

The public receipt does not echo the full message body or phone number.

## Administrator inbox

All routes require:

```http
Authorization: Bearer <accessToken>
```

| Action | Who |
|--------|-----|
| List / view / status / soft-delete | Super Admin, Communication Manager (`admissions:manage`) |
| Restore soft-deleted | Super Admin only (`admissions:restore`) |
| Content Editor | Denied |

### GET `/api/v1/admin/admissions/inquiries`

Query parameters:

| Param | Description |
|-------|-------------|
| `page` | Page number (default 1) |
| `limit` | Page size 1–100 (default 20) |
| `q` | Search student name, guardian name, email, or phone (`contains`) |
| `status` | `NEW` \| `CONTACTED` \| `UNDER_REVIEW` \| `CLOSED` |
| `gradeApplyingFor` | Exact grade filter |
| `academicYear` | Exact academic year filter |
| `sortOrder` | `asc` \| `desc` by `createdAt` (default `desc`) |
| `includeDeleted` | Include soft-deleted rows (default false) |

Filtering and pagination are performed in MySQL via Prisma.

### GET `/api/v1/admin/admissions/inquiries/:id`

Returns the full inquiry for authorized administrators. Soft-deleted rows return `404` on this route.

### PATCH `/api/v1/admin/admissions/inquiries/:id/status`

```json
{ "status": "CONTACTED" }
```

Audited as `admissions.status_update`. Audit metadata stores status transition and grade/year only — not the message body.

### DELETE `/api/v1/admin/admissions/inquiries/:id`

Soft-deletes the inquiry (`deletedAt`). Audited as `admissions.delete`.

### PATCH `/api/v1/admin/admissions/inquiries/:id/restore`

Super Admin only. Clears `deletedAt`. Audited as `admissions.restore`.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `ADMISSIONS_RATE_LIMIT_WINDOW_MS` | Public submission window (default 900000) |
| `ADMISSIONS_RATE_LIMIT_MAX` | Max submissions per window (default 5) |

## Error responses

```json
{
  "success": false,
  "message": "Human-readable message",
  "code": "ERROR_CODE",
  "errors": []
}
```

Common codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `ADMISSION_INQUIRY_NOT_FOUND`, `ADMISSIONS_RATE_LIMIT_EXCEEDED`, `ADMISSION_INQUIRY_NOT_DELETED`.

## Postman testing sequence

1. `POST /api/v1/admissions/inquiries` with valid fields → expect `201`, status `NEW`
2. Repeat with missing fields / invalid email / invalid phone → expect `422`
3. Login as Communication Manager
4. `GET /api/v1/admin/admissions/inquiries` → list, paginate, search, filter by status/grade/year
5. `GET /api/v1/admin/admissions/inquiries/:id`
6. `PATCH .../:id/status` with `{ "status": "CONTACTED" }`
7. `DELETE .../:id`
8. Confirm Content Editor receives `403`
9. Login as Super Admin → `PATCH .../:id/restore`
10. Confirm public submit works without a Bearer token
