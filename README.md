# High School Website Platform

## Structure

```
backend/     Express + Prisma + MySQL API  → Railway
frontend/    Static Vite school site       → Netlify
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
- Docs: `backend/docs/`
- Tests: `cd backend && npm test`

## Deploy on Railway (API)

1. Service **Settings → Root Directory** → `backend`.
2. Config path (if asked) → `/backend/railway.toml`.
3. Add MySQL; set `NODE_ENV=production`, `JWT_SECRET`, `CORS_ORIGIN` (Netlify URL).
4. Redeploy.

## Deploy on Netlify (UI)

Repo already includes `netlify.toml` (`base = frontend`).

1. Site settings → clear any custom Base directory if it conflicts (toml wins), or set Base to `frontend`.
2. Build: `npm run build` · Publish: `dist`.
3. Trigger a new deploy after this push.
4. When Railway API is live, set each page’s `window.API_BASE_URL` to `https://YOUR-API.up.railway.app/api/v1` and set Railway `CORS_ORIGIN` to the Netlify URL.
