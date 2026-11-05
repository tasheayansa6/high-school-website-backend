# Contact Form & Administrator Inbox API

Base path: `/api/v1`

## Public submission

### POST `/api/v1/contact`

No authentication required. Rate limited (`CONTACT_RATE_LIMIT_MAX`, default 5 per 15 minutes).

Request:

```json
{
  "name": "Parent Name",
  "email": "parent@example.com",
  "phone": "+251911000000",
  "subject": "Admissions question",
  "message": "I would like more information about enrollment."
}
```

`phone` is optional. Field limits follow the database schema (`name` 150, `email` 255, `phone` 50, `subject` 255, `message` 5000).

Success `201`:

```json
{
  "success": true,
  "message": "Contact message submitted successfully",
  "data": {
    "submission": {
      "id": 1,
      "name": "Parent Name",
      "email": "parent@example.com",
      "subject": "Admissions question",
      "createdAt": "2026-11-04T12:00:00.000Z"
    }
  }
}
```

The public response does not echo the full message body.

## Administrator inbox

All routes require:

```http
Authorization: Bearer <accessToken>
```

Permissions:

| Action | Who |
|--------|-----|
| List / view / status / archive | Super Admin, Communication Manager (`contact:manage`) |
| Restore archived | Super Admin only (`contact:restore`) |
| Content Editor | Denied |

### GET `/api/v1/admin/contact-messages`

Query: `page`, `limit`, `q`, `status` (`NEW|READ|REPLIED|ARCHIVED`), `sortOrder` (`asc|desc`, default `desc`), `includeArchived` (default false).

Default listing excludes `ARCHIVED` messages.

### GET `/api/v1/admin/contact-messages/:id`

Returns full message. Archived messages are not returned here (`404`).

### PATCH `/api/v1/admin/contact-messages/:id/status`

```json
{ "status": "READ" }
```

### DELETE `/api/v1/admin/contact-messages/:id`

Archives the message (`status = ARCHIVED`).  
`ContactMessage` has no `deletedAt` column, so this is the recoverable delete convention for this model.

### PATCH `/api/v1/admin/contact-messages/:id/restore`

Super Admin only. Restores an archived message to `NEW`.

## Supported statuses

`NEW`, `READ`, `REPLIED`, `ARCHIVED`

## Postman sequence

1. `POST /api/v1/contact` with valid fields  
2. Login as Communication Manager  
3. `GET /api/v1/admin/contact-messages`  
4. `GET /api/v1/admin/contact-messages/:id`  
5. `PATCH .../:id/status` with `{ "status": "READ" }`  
6. `DELETE .../:id`  
7. Login as Super Admin → `PATCH .../:id/restore`  
8. Confirm Content Editor receives `403` on inbox routes  
