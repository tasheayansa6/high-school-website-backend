# Website Settings Management API

Base path: `/api/v1`

Database-backed key/value website configuration using the existing `WebsiteSetting` model. Ordinary school content (name, contact, social links, etc.) can be updated without code changes.

Application secrets (JWT, SMTP passwords, database credentials) are **never** stored as website settings.

## Setting catalog

Only allowlisted keys are accepted. Groups:

| Group | Example keys |
|-------|----------------|
| `identity` | `school.name`, `school.tagline`, `school.description` |
| `contact` | `contact.email`, `contact.phone`, `contact.address` |
| `website` | `website.logoUrl`, `website.faviconUrl`, `website.primaryLanguage` |
| `social` | `social.facebook`, `social.twitter`, `social.instagram`, `social.youtube` |
| `general` | `general.footerText`, `general.copyright` |
| `admissions` | `admissions.inquiryEmail`, `admissions.inquiryPhone`, `admissions.instructions` |
| `internal` | `internal.adminNotes` (**not** public) |

Public keys are returned by `GET /settings/public`. Internal keys are admin-only.

`school.name` is non-deletable once present. Other allowlisted keys may be deleted by Super Admin.

## Public endpoint

### GET `/api/v1/settings/public`

No authentication.

```json
{
  "success": true,
  "message": "Public website settings retrieved",
  "data": {
    "settings": {
      "school.name": "Example High School",
      "contact.email": "info@example.com"
    }
  }
}
```

Missing keys are omitted. Internal settings never appear.

## Admin endpoints

```http
Authorization: Bearer <accessToken>
```

Permission: `settings:manage` (Super Admin only via current role map).

Content Editor and Communication Manager receive `403`.

### GET `/api/v1/admin/settings`

Optional query: `group` (`identity` \| `contact` \| `website` \| `social` \| `general` \| `admissions` \| `internal`).

Returns full metadata including `isPublic`, `label`, `updatedBy`.

### GET `/api/v1/admin/settings/:key`

Returns one allowlisted setting. Unknown keys → `422`. Missing stored value → `404`.

### PUT `/api/v1/admin/settings`

Bulk upsert (transactional with audit per key):

```json
{
  "settings": {
    "school.name": "Example High School",
    "contact.email": "info@example.com",
    "website.logoUrl": "https://cdn.example.com/logo.png"
  }
}
```

Unknown keys and extra body fields are rejected. Values are type-checked (email / URL / phone / text length).

### PATCH `/api/v1/admin/settings/:key`

```json
{ "value": "Updated tagline" }
```

Creates the row if missing; updates if present.

### DELETE `/api/v1/admin/settings/:key`

Deletes an allowlisted, deletable setting. `school.name` cannot be deleted (`SETTING_NOT_DELETABLE`).

## Validation rules

| Type | Rule |
|------|------|
| `text` | Non-empty after trim; max length per key |
| `email` | Standard email format |
| `url` | Absolute `http` or `https` URL |
| `phone` | Digits with optional `+ - ( ) .` spaces; 7–15 digits |

## Error codes

`VALIDATION_ERROR`, `SETTING_KEY_INVALID`, `SETTING_NOT_FOUND`, `SETTING_NOT_DELETABLE`, `SETTING_KEY_CONFLICT`, `UNAUTHORIZED`, `FORBIDDEN`

## Audit

Actions: `settings.create`, `settings.update`, `settings.delete`. Metadata stores `key` and `group` only — not values.

## Postman sequence

1. `GET /settings/public` without auth  
2. Login as Super Admin → `PUT /admin/settings` with public + `internal.adminNotes`  
3. Confirm public endpoint excludes `internal.adminNotes`  
4. `PATCH /admin/settings/contact.email` with invalid email → `422`  
5. Login as Content Editor / Communication Manager → expect `403`  
6. Delete a deletable key; confirm audit log  
