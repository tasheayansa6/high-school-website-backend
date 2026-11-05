# Deployment Guide (without Docker)

Production preparation for the High School Website Platform backend.

## Requirements

- Node.js **20+** (`engines.node` in `package.json`)
- npm 10+
- MySQL **8** with a dedicated application database and user
- Reverse proxy with TLS (nginx, Caddy, or equivalent)
- Persistent disk for media uploads (`MEDIA_STORAGE_PATH`)

## MySQL setup

1. Create database and user (prefer `caching_sha2_password`).
2. Grant DML on the application database.
3. For `prisma migrate deploy`, the user needs DDL privileges on that database.
4. Prefer `127.0.0.1` over `localhost` in connection strings when using TCP.

Do **not** use the MySQL root account for the application runtime.

## Environment

```bash
cp .env.example .env
# Edit .env — never commit real secrets
```

Production must set:

| Variable | Notes |
|----------|-------|
| `NODE_ENV=production` | Enables strict startup checks |
| `JWT_SECRET` | Random string, **≥ 32 characters** |
| `CORS_ORIGIN` | Explicit frontend origin allowlist (no `*`) |
| `DATABASE_*` / `DATABASE_URL` | Matching MySQL credentials |
| `EMAIL_TRANSPORT` | Prefer `smtp` with `SMTP_*` for real mail |
| `MEDIA_STORAGE_PATH` | Absolute path on persistent storage |
| `API_PUBLIC_URL` / `MEDIA_PUBLIC_BASE_URL` | Public HTTPS API base |
| `APP_PUBLIC_URL` | Frontend origin used in email links |

Startup **aborts** in production if database config/JWT/CORS are invalid or MySQL is unreachable.

## Install and migrate

```bash
npm ci
npm run prisma:generate
npm run prisma:migrate:deploy
```

Safe production migration command:

```bash
npx prisma migrate deploy
```

Do **not** run `prisma migrate dev` or `prisma db push --force-reset` against production.

## Initial Super Admin

```bash
SUPER_ADMIN_EMAIL='admin@example.com' \
SUPER_ADMIN_PASSWORD='ReplaceWithStrongPass1' \
SUPER_ADMIN_FIRST_NAME='Site' \
SUPER_ADMIN_LAST_NAME='Admin' \
npm run admin:create-super
```

There is no public registration endpoint.

## Start the API

```bash
npm start
# equivalent: NODE_ENV=production node src/server.js
```

### Process management

Use a process manager such as **systemd** or **PM2** so the API restarts on failure and starts on boot.

Example systemd unit responsibilities:

- `WorkingDirectory` = project root
- `EnvironmentFile` = path to `.env`
- `ExecStart` = `node src/server.js` with `NODE_ENV=production`
- Restart on failure

### Reverse proxy / HTTPS

- Terminate TLS at the reverse proxy.
- Proxy to `http://127.0.0.1:5000` (or your `PORT`).
- Forward `X-Forwarded-For` / `X-Forwarded-Proto` if you rely on client IPs behind the proxy.
- Restrict direct public access to the Node port.

## Media storage

- Files live on disk under `MEDIA_STORAGE_PATH` (default `./storage/uploads`, gitignored).
- Back up this directory with the same retention policy as the database.
- After restore, ensure the process user can read/write the directory.

## Database backup and recovery

### Backup

```bash
mysqldump -u BACKUP_USER -p --single-transaction --routines high_school_db > backup.sql
```

Store dumps encrypted and off-host. Schedule daily backups at minimum.

### Recovery

1. Stop the API process.
2. Restore the dump into MySQL.
3. Restore media files to `MEDIA_STORAGE_PATH`.
4. Confirm `.env` matches the restored environment.
5. Run `npm run prisma:migrate:deploy` only if migrations are pending.
6. Start the API and verify `/api/v1/health`.

## Health check

```bash
curl -fsS https://api.example.com/api/v1/health
```

## Post-deploy smoke checks

1. Admin login → `/admin/auth/me`
2. Public pages/blog/events/settings
3. Media content URL fetch
4. Contact / admissions / newsletter public submissions (rate limits apply)

## Security checklist

- [ ] Strong unique `JWT_SECRET`
- [ ] Explicit `CORS_ORIGIN`
- [ ] TLS at the proxy
- [ ] `.env` not world-readable; not in Git
- [ ] Media directory not directly exposed by the proxy (serve via API)
- [ ] SMTP credentials set only in environment
- [ ] Rate limits reviewed for production traffic
