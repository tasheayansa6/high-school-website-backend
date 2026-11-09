# Abyssinia Academy — Frontend

React + TypeScript + Vite public website for Abyssinia Academy.

## Status

- **Phase 1:** project foundation
- **Phase 2:** code quality & engineering standards
- **Phase 3:** design system
- **Phase 4:** routing + public layout
- **Phase 5:** shared header, footer, navigation
- **Phase 6:** public website pages
- **Phase 7:** multilingual support (en / am / om)
- **Phase 8:** API client architecture (Axios + TanStack Query)
- Dynamic page/form wiring: later phases (awaiting approval)

i18n: `src/i18n/` · API services: `src/services/` · Locale review: [`src/i18n/locales/TRANSLATION_REVIEW.md`](./src/i18n/locales/TRANSLATION_REVIEW.md).

Standards: [`CODE_STANDARDS.md`](./CODE_STANDARDS.md) · Design system: [`DESIGN_SYSTEM.md`](./DESIGN_SYSTEM.md)

## Scripts

```bash
cp .env.example .env
npm install
npm run dev
npm run quality          # lint + format:check + type-check + build
npm run lint
npm run format:check
npm run type-check
npm run test
npm run api:smoke       # live backend smoke (backend must be running)
npm run build
```

## Environment

`VITE_API_BASE_URL` — backend public API base (default local: `http://localhost:5000/api/v1`).

Backend CORS must allow the Vite origin (`http://localhost:5173` by default) and the production Vercel domain via `CORS_ORIGIN`.

## Deploy (Vercel)

- Root directory: `frontend`
- Build: `npm run build`
- Output: `dist`
- SPA rewrite configured in `vercel.json`

## Design reference

Approved Stitch HTML snapshots: `../docs/stitch-reference/`
