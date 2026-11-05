# High School Website Platform

## Structure

```
backend/     Express + Prisma + MySQL API
```

Public site (sibling): `../high-school-website`

## Backend

```bash
cd backend
cp .env.example .env   # configure MySQL if needed
npm install
npm run prisma:generate
npm run prisma:migrate:deploy
npm run dev
```

- API: `http://localhost:5000/api/v1`
- Docs: `backend/docs/`
- Tests: `cd backend && npm test`

## Deploy on Railway

The Node app lives in `backend/` (repo root has no `package.json`).

1. Create a service from this GitHub repo.
2. Service **Settings → Root Directory** → set to `backend` (or `/backend`).
3. Settings → **Config as Code** path (if asked) → `/backend/railway.toml`.
4. Add a **MySQL** plugin/service and copy its credentials into Variables (`DATABASE_URL`, `DATABASE_HOST`, etc.).
5. Set at least: `NODE_ENV=production`, `JWT_SECRET` (≥32 chars), `CORS_ORIGIN` (your frontend URL).
6. Redeploy.
