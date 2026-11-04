# High School Website Platform — Backend

Node.js / Express / MySQL / Prisma REST API for a high school website in Ethiopia.

Frontend is developed separately (React + TypeScript).

## Requirements

- Node.js 20+
- MySQL 8
- npm

## Quick start

```bash
cp .env.example .env
# Edit .env with real MySQL credentials and CORS_ORIGIN

npm install
npm run prisma:generate
npm run dev
```

API base URL: `http://localhost:5000/api/v1`

## Scripts

| Script | Purpose |
|--------|---------|
| `npm run dev` | Development server with nodemon |
| `npm start` | Production server |
| `npm run prisma:validate` | Validate Prisma schema |
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:migrate` | Create/apply migrations (dev) |
| `npm run prisma:migrate:deploy` | Apply migrations (production) |
| `npm run prisma:studio` | Prisma Studio |

## Architecture

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for:

- Folder responsibilities
- Middleware
- Response and error conventions
- Soft-delete approach
- CORS and environment configuration

Database design: [docs/DATABASE.md](docs/DATABASE.md)

## Health check

```bash
curl http://localhost:5000/api/v1/health
```

## Current phase status

- Phase 1: Project foundation
- Phase 2: MySQL + Prisma configuration
- Phase 3: Core database schema
- Phase 4: Backend architecture, middleware, error handling
