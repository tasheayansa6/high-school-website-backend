# API Documentation Index

Base URL: `/api/v1`

Standard success envelope: `{ success: true, message, data }`  
Standard error envelope: `{ success: false, message, code?, errors? }`

## Guides

| Document | Contents |
|----------|----------|
| [ARCHITECTURE.md](./ARCHITECTURE.md) | Structure, middleware, responses, soft-delete |
| [DATABASE.md](./DATABASE.md) | Schema, migrations, relationships |
| [AUTH.md](./AUTH.md) | Login, JWT, logout, roles/permissions |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | Production setup without Docker |
| [Postman collection](./postman/High_School_Website_API.postman_collection.json) | Workflow collection |

## Module APIs

| Module | Doc | Public | Admin |
|--------|-----|--------|-------|
| Pages | [API_PAGES.md](./API_PAGES.md) | `/pages` | `/admin/pages` |
| Blog | [API_BLOG.md](./API_BLOG.md) | `/blog` | `/admin/blog` |
| Contact | [API_CONTACT.md](./API_CONTACT.md) | `/contact` | `/admin/contact-messages` |
| Newsletter | [API_NEWSLETTER.md](./API_NEWSLETTER.md) | `/newsletter` | `/admin/newsletter` |
| Admissions | [API_ADMISSIONS.md](./API_ADMISSIONS.md) | `/admissions` | `/admin/admissions` |
| Events | [API_EVENTS.md](./API_EVENTS.md) | `/events` | `/admin/events` |
| Media | [API_MEDIA.md](./API_MEDIA.md) | `/media/:id/content` | `/admin/media` |
| Settings | [API_SETTINGS.md](./API_SETTINGS.md) | `/settings/public` | `/admin/settings` |
| Dashboard | [API_DASHBOARD.md](./API_DASHBOARD.md) | — | `/admin/dashboard` |

## Auth endpoints

- `POST /admin/auth/login`
- `GET /admin/auth/me`
- `POST /admin/auth/logout`

## Permissions (summary)

| Permission | Typical roles |
|------------|---------------|
| `*` | Super Admin |
| `pages:*`, `blog:*`, `events:*`, `media:*` | Content Editor (+ Super Admin) |
| `contact:*`, `newsletter:*`, `admissions:*` | Communication Manager (+ Super Admin) |
| `settings:manage` | Super Admin |
| `dashboard:read` | Super Admin, Content Editor, Communication Manager |
| `*:restore` | Super Admin only |

## Frontend integration notes

- Send `Authorization: Bearer <accessToken>` on admin routes.
- Prefer absolute media URLs from `featuredImage.url` / media upload responses.
- Public settings are a key→value map from `/settings/public`.
- Newsletter confirmation uses email links pointing at `API_PUBLIC_URL`.
- CORS must allow the React origin (`CORS_ORIGIN`).
