# High School Website Platform

## Structure

```
backend/     Express + Prisma + MySQL API     → Railway
frontend/    React + TypeScript + Vite site  → Vercel
```

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
- Tests: `cd backend && npm test`

## Deploy on Railway (API)

1. Service **Settings → Root Directory** → `backend`.
2. Config path (if asked) → `/backend/railway.toml`.
3. Add MySQL; set `NODE_ENV=production`, `JWT_SECRET`, `CORS_ORIGIN` (Vercel URL).
4. Redeploy.

## Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

See `frontend/README.md` for lint, typecheck, test, and build scripts.

## Deploy on Vercel (UI)

1. [vercel.com/new](https://vercel.com/new) → import the repository.
2. **Root Directory** → `frontend`.
3. Framework: **Vite** · Build: `npm run build` · Output: `dist`.
4. Set `VITE_API_BASE_URL` to the Railway API (`…/api/v1`).
5. Set Railway `CORS_ORIGIN` to the Vercel origin.
