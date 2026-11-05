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
