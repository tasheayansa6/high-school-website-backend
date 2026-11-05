# Newsletter Subscription & Management API

Base path: `/api/v1`

Double opt-in subscription with hashed confirmation and unsubscribe tokens. MySQL is the source of truth.

## Subscription status lifecycle

| Status | Meaning |
|--------|---------|
| `PENDING` | Subscribed but not yet confirmed |
| `ACTIVE` | Confirmed and eligible for newsletters |
| `UNSUBSCRIBED` | Opted out (or soft-deleted admin cleanup) |

Flow:

1. `POST /newsletter/subscribe` → `PENDING` + confirmation email
2. `GET /newsletter/confirm?token=...` → `ACTIVE` + unsubscribe token issued
3. `POST /newsletter/unsubscribe` → `UNSUBSCRIBED`

Administrators may also change status or soft-delete (`deletedAt`). Soft-deleted rows are excluded from default listings.

## Token security

- Confirmation and unsubscribe tokens are cryptographically random.
- Only SHA-256 hashes are stored in MySQL (`confirmation_token_hash`, `unsubscribe_token_hash`).
- Confirmation tokens expire after `NEWSLETTER_CONFIRMATION_TTL_HOURS` (default 48).
- Confirmation tokens are single-use (cleared on success).
- Unsubscribe is idempotent and safe to repeat.
- Database IDs are never used as unsubscribe credentials.
- Tokens must never appear in application logs or audit metadata.

## Email configuration

| Variable | Purpose |
|----------|---------|
| `EMAIL_TRANSPORT` | `smtp` (production) or `json` (dev/tests; captures messages in memory) |
| `SMTP_HOST` | SMTP server host |
| `SMTP_PORT` | SMTP port (default `587`) |
| `SMTP_SECURE` | `true` for TLS on connect (default `false`) |
| `SMTP_USER` | SMTP username (optional) |
| `SMTP_PASS` | SMTP password (optional) |
| `SMTP_FROM` | From header |
| `API_PUBLIC_URL` | Base used in confirmation links (default `http://localhost:5000/api/v1`) |
| `APP_PUBLIC_URL` | Frontend base used in unsubscribe links (default `http://localhost:5173`) |
| `NEWSLETTER_CONFIRMATION_TTL_HOURS` | Confirmation token lifetime |
| `NEWSLETTER_RATE_LIMIT_WINDOW_MS` | Public newsletter rate-limit window |
| `NEWSLETTER_RATE_LIMIT_MAX` | Max public newsletter requests per window (default 5) |

Development without SMTP: set `EMAIL_TRANSPORT=json`. Do not claim real delivery occurred unless SMTP succeeds.

## Public endpoints

No administrator authentication. Subscribe and confirm are rate limited.

### POST `/api/v1/newsletter/subscribe`

```json
{ "email": "parent@example.com" }
```

Success `202` (generic; does not reveal whether the address was new or already active):

```json
{
  "success": true,
  "message": "If this email can receive messages, a confirmation link has been sent.",
  "data": null
}
```

Notes:

- Email is validated and normalized to lowercase.
- Active subscribers do not receive another confirmation email.
- Pending / unsubscribed / restored emails receive a fresh confirmation challenge.
- Delivery failure returns `503` with `EMAIL_DELIVERY_FAILED` or `EMAIL_NOT_CONFIGURED`. The subscriber remains `PENDING`.

### GET `/api/v1/newsletter/confirm?token=...`

Success `200`:

```json
{
  "success": true,
  "message": "Subscription confirmed successfully.",
  "data": null
}
```

Errors:

| Code | When |
|------|------|
| `CONFIRMATION_TOKEN_REQUIRED` | Missing token |
| `CONFIRMATION_TOKEN_INVALID` | Unknown, used, or concurrent race loser |
| `CONFIRMATION_TOKEN_EXPIRED` | Past expiry |

### POST `/api/v1/newsletter/unsubscribe`

```json
{ "token": "<unsubscribe-token>" }
```

Success `200` (generic for valid and invalid tokens):

```json
{
  "success": true,
  "message": "If the subscription exists, it has been unsubscribed.",
  "data": null
}
```

## Administrator endpoints

All require:

```http
Authorization: Bearer <accessToken>
```

| Action | Who |
|--------|-----|
| List / view / status / soft-delete | Super Admin, Communication Manager (`newsletter:manage`) |
| Restore soft-deleted | Super Admin only (`newsletter:restore`) |
| Content Editor | Denied |

Token hashes are never returned in admin payloads.

### GET `/api/v1/admin/newsletter/subscribers`

Query:

| Param | Description |
|-------|-------------|
| `page` | Page number (default 1) |
| `limit` | Page size 1–100 (default 20) |
| `q` | Email search (`contains`) |
| `status` | `PENDING` \| `ACTIVE` \| `UNSUBSCRIBED` |
| `sortOrder` | `asc` \| `desc` by `createdAt` (default `desc`) |
| `includeDeleted` | Include soft-deleted rows (default false) |

### GET `/api/v1/admin/newsletter/subscribers/:id`

Returns subscriber metadata. Soft-deleted rows return `404` unless accessed via restore/includeDeleted flows.

### PATCH `/api/v1/admin/newsletter/subscribers/:id/status`

```json
{ "status": "ACTIVE" }
```

Audited as `newsletter.status_update`.

### DELETE `/api/v1/admin/newsletter/subscribers/:id`

Soft-deletes (`deletedAt`), sets status to `UNSUBSCRIBED`, clears confirmation tokens. Audited as `newsletter.delete`.

### PATCH `/api/v1/admin/newsletter/subscribers/:id/restore`

Super Admin only. Clears `deletedAt`, leaves status `UNSUBSCRIBED`. Audited as `newsletter.restore`.

## Error responses

Follow the platform envelope:

```json
{
  "success": false,
  "message": "Human-readable message",
  "code": "ERROR_CODE",
  "errors": []
}
```

Common codes: `VALIDATION_ERROR`, `UNAUTHORIZED`, `FORBIDDEN`, `SUBSCRIBER_NOT_FOUND`, `NEWSLETTER_RATE_LIMIT_EXCEEDED`, `EMAIL_NOT_CONFIGURED`, `EMAIL_DELIVERY_FAILED`.

## Postman testing sequence

1. Set `EMAIL_TRANSPORT=json` (or configure SMTP).
2. `POST /api/v1/newsletter/subscribe` with a new email → expect `202`.
3. Read confirmation link from SMTP inbox or test outbox; open `GET /api/v1/newsletter/confirm?token=...`.
4. Confirm admin list shows `ACTIVE` for that email.
5. Use the unsubscribe token from the welcome email: `POST /api/v1/newsletter/unsubscribe`.
6. Confirm status is `UNSUBSCRIBED`.
7. Login as Communication Manager → list, filter, search, status update, soft-delete.
8. Login as Super Admin → restore.
9. Login as Content Editor → expect `403` on admin newsletter routes.
10. Call public subscribe/confirm/unsubscribe without a Bearer token → still reachable.
