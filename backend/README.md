# High School Website Platform — Backend

Node.js / Express / MySQL / Prisma REST API for a high school website.

Frontend is developed separately (React + TypeScript) and consumes `/api/v1`.

## Requirements

- Node.js 20+
- MySQL 8
- npm

## Quick start

```bash
cp .env.example .env
# Edit .env with MySQL credentials, CORS_ORIGIN, and JWT_SECRET

npm install
npm run prisma:generate
npm run prisma:migrate:deploy   # or npm run prisma:migrate in local dev
npm run admin:create-super      # with SUPER_ADMIN_* env vars
npm run dev
```

API base URL: `http://localhost:5000/api/v1`

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Development server (nodemon) |
| `npm start` | Production server (`NODE_ENV=production`) |
| `npm test` | Full automated test suite |
| `npm run prisma:validate` | Validate Prisma schema |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Create/apply migrations (dev) |
| `npm run prisma:migrate:deploy` | Apply migrations (production) |
| `npm run admin:create-super` | Create the first Super Admin |

Module test scripts: `test:auth`, `test:pages`, `test:blog`, `test:contact`, `test:newsletter`, `test:admissions`, `test:events`, `test:media`, `test:settings`, `test:dashboard`.

## Documentation

| Doc | Description |
|-----|-------------|
| [docs/API_INDEX.md](docs/API_INDEX.md) | API catalog and permissions summary |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Architecture and conventions |
| [docs/DATABASE.md](docs/DATABASE.md) | Schema and migrations |
| [docs/AUTH.md](docs/AUTH.md) | Authentication and roles |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Production deployment (no Docker) |
| [docs/postman/…](docs/postman/High_School_Website_API.postman_collection.json) | Postman workflows |

Module APIs: [Pages](docs/API_PAGES.md) · [Blog](docs/API_BLOG.md) · [Contact](docs/API_CONTACT.md) · [Newsletter](docs/API_NEWSLETTER.md) · [Admissions](docs/API_ADMISSIONS.md) · [Events](docs/API_EVENTS.md) · [Media](docs/API_MEDIA.md) · [Settings](docs/API_SETTINGS.md) · [Dashboard](docs/API_DASHBOARD.md)

## Health check

```bash
curl http://localhost:5000/api/v1/health
```

## Super Admin bootstrap

```bash
SUPER_ADMIN_EMAIL=admin@example.com \
SUPER_ADMIN_PASSWORD='ReplaceWithStrongPass1' \
npm run admin:create-super
```

There is no public registration.

## Configuration notes

- `.env` and `storage/` are gitignored.
- Use `EMAIL_TRANSPORT=json` locally; configure `SMTP_*` for real mail.
- Media files are stored under `MEDIA_STORAGE_PATH` (default `./storage/uploads`).
- Production rejects missing/unsafe JWT, CORS, and database configuration at startup.

## Phase status

Phases 1–15 complete (foundation through final QA / production readiness).
