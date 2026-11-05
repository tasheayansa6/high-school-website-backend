# Administrator Authentication — Frontend Integration

## Token strategy

- Access tokens are **JWTs**.
- The React frontend must send:

```http
Authorization: Bearer <accessToken>
```

- Tokens expire according to `JWT_EXPIRES_IN` (default `8h`).
- **Logout** increments the administrator `tokenVersion` in MySQL so previously issued JWTs are rejected by the server. The frontend should also clear the token from storage (memory/localStorage/sessionStorage).
- Do not put role or permission claims from the client into requests. The server loads role data from the database on each authenticated request.

## Endpoints

### POST `/api/v1/admin/auth/login`

Request:

```json
{
  "email": "admin@example.com",
  "password": "your-password"
}
```

Success `200`:

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "accessToken": "<jwt>",
    "tokenType": "Bearer",
    "expiresIn": "8h",
    "admin": {
      "id": 1,
      "email": "admin@example.com",
      "firstName": "Site",
      "lastName": "Admin",
      "isActive": true,
      "lastLoginAt": "2026-11-04T10:00:00.000Z",
      "role": {
        "id": 1,
        "name": "Super Admin",
        "slug": "super-admin"
      },
      "permissions": ["*"]
    }
  }
}
```

Common errors:

| Status | Code | When |
|--------|------|------|
| 422 | `VALIDATION_ERROR` | Missing/invalid fields |
| 401 | `INVALID_CREDENTIALS` | Unknown email, wrong password, inactive/deleted |
| 429 | `LOGIN_RATE_LIMIT_EXCEEDED` | Too many login attempts |

Login failures intentionally use a generic message and do not reveal whether the email exists.

### GET `/api/v1/admin/auth/me`

Headers:

```http
Authorization: Bearer <accessToken>
```

Success `200`:

```json
{
  "success": true,
  "message": "Administrator profile retrieved",
  "data": {
    "admin": {
      "id": 1,
      "email": "admin@example.com",
      "firstName": "Site",
      "lastName": "Admin",
      "isActive": true,
      "lastLoginAt": "2026-11-04T10:00:00.000Z",
      "role": {
        "id": 1,
        "name": "Super Admin",
        "slug": "super-admin"
      },
      "permissions": ["*"]
    }
  }
}
```

Errors: `401 UNAUTHORIZED`, `401 TOKEN_EXPIRED`, `401 TOKEN_INVALID`, `401 TOKEN_REVOKED`.

### POST `/api/v1/admin/auth/logout`

Headers:

```http
Authorization: Bearer <accessToken>
```

Success `200`:

```json
{
  "success": true,
  "message": "Logout successful. Existing access tokens for this account are no longer valid.",
  "data": null
}
```

## Roles

| Slug | Responsibility |
|------|----------------|
| `super-admin` | Full administration (`*` permission), including restores and settings |
| `content-editor` | pages, blog, events, media, dashboard read |
| `communication-manager` | contact, newsletter, admissions, dashboard read |

Permission source of truth: `src/config/roles.js`. JWT payloads are not trusted for authorization.

## Initial Super Admin creation

No public registration endpoint exists. Create the first account with:

```bash
SUPER_ADMIN_EMAIL=admin@example.com \
SUPER_ADMIN_PASSWORD='ReplaceWithStrongPass1' \
SUPER_ADMIN_FIRST_NAME=Site \
SUPER_ADMIN_LAST_NAME=Admin \
npm run admin:create-super
```

Password rules enforced by the script: at least 10 characters, include a letter and a number.

## Environment variables

```env
JWT_SECRET=long-random-secret
JWT_EXPIRES_IN=8h
JWT_ISSUER=high-school-website-backend
JWT_AUDIENCE=high-school-admin
LOGIN_RATE_LIMIT_WINDOW_MS=900000
LOGIN_RATE_LIMIT_MAX=10
```

`JWT_SECRET` is required in production and must be at least 32 characters.
