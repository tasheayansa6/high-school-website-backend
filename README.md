# High School Website Platform

## Structure

```
backend/     Express + Prisma + MySQL API  → Railway
frontend/    Static Vite school site       → Vercel (or Netlify)
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

## Deploy on Vercel (UI)

1. [vercel.com/new](https://vercel.com/new) → import `tasheayansa6/high-school-website-backend`.
2. **Root Directory** → `frontend` (Edit → select `frontend`).
3. Framework: **Vite** · Build: `npm run build` · Output: `dist`.
4. Deploy. Open the `*.vercel.app` URL after it succeeds.
5. When Railway API is live, set pages’ `window.API_BASE_URL` to `https://YOUR-API.up.railway.app/api/v1` and set Railway `CORS_ORIGIN` to the Vercel URL.

## Deploy on Netlify (UI, optional)

`netlify.toml` uses `base = frontend`. Build `npm run build`, publish `dist`.
