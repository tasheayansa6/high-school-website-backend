# Database Design — High School Website Platform

## Overview

The backend uses **MySQL** with **Prisma ORM (v7)**. Connection settings come from environment variables (see `.env.example`). The Prisma schema lives in `prisma/schema.prisma`. Prisma 7 keeps the datasource URL in `prisma.config.cjs`.

This document describes the Phase 3 core schema. No sample or seed data is included.

## Migration

| Item | Value |
|------|--------|
| Initial migration | `20261104092753_init_core_website_schema` |
| Auth migration | `20261104102318_add_admin_token_version` |
| Newsletter tokens | `20261104112000_newsletter_secure_tokens` |
| Admissions inquiries | `20261105114500_add_admission_inquiries` |
| Event slug/publish/media | `20261105120000_event_slug_publish_media` |
| Status | Applied successfully to `high_school_db` |

Production apply command (non-destructive):

```bash
npm run prisma:migrate:deploy
```

Do not run `prisma migrate reset` or destructive `db push` against shared/production data.

`admins.token_version` supports JWT logout revocation.  
`newsletter_subscribers` stores hashed confirmation/unsubscribe tokens, confirmation expiry, and soft-delete (`deleted_at`).

Useful commands:

```bash
npm run prisma:validate
npm run prisma:generate
npm run prisma:migrate
npm run prisma:migrate:deploy
```

## Tables

| Table | Purpose |
|-------|---------|
| `roles` | Administrator roles |
| `admins` | Administrator accounts |
| `pages` | Dynamic public pages (About, Academics, etc.) |
| `blog_categories` | Blog categories |
| `blog_posts` | Blog articles |
| `contact_messages` | Contact form submissions |
| `newsletter_subscribers` | Newsletter subscriptions |
| `admission_inquiries` | Admissions inquiries (inbox only) |
| `events` | School events |
| `media_assets` | Uploaded file metadata (not binary content) |
| `website_settings` | Key/value public site configuration |
| `audit_logs` | Administrator activity history |

## Relationships (summary)

- `roles` 1 — N `admins` (Restrict on role delete)
- `admins` 1 — N `blog_posts` as author (Restrict)
- `blog_categories` 1 — N `blog_posts` (SetNull on category delete)
- `media_assets` 1 — N `blog_posts` as featured image (SetNull)
- `admins` optional links to pages, events, media, settings, contact handling, and audit logs (mostly SetNull)

See [database-erd.md](./database-erd.md) for the Mermaid ER diagram.

## Design decisions

1. **Soft deletes** (`deleted_at`) on important content and admin accounts (`admins`, `pages`, `blog_posts`, `blog_categories`, `events`, `media_assets`, `newsletter_subscribers`, `admission_inquiries`) to reduce accidental permanent loss. Application queries should filter `deleted_at IS NULL`.
2. **Enums** for publication and workflow statuses to keep MySQL values consistent.
3. **Media metadata only** — `storage_path` references files on disk/object storage; binaries are never stored in MySQL.
4. **Website settings as key/value** — flexible for contact details, social links, and other public configuration without schema changes per setting.
5. **Audit logs retain history** — `admin_id` uses `ON DELETE SET NULL` so logs remain if an admin row is hard-deleted.
6. **Roles cannot be deleted while assigned** — `ON DELETE RESTRICT` on `admins.role_id`.
7. **Snake_case table/column names** in MySQL via `@@map` / `@map`, with camelCase Prisma field names for the JavaScript client.
8. **Indexes** on status, slug/email uniqueness, foreign keys, and common filter/sort columns (`published_at`, `starts_at`, `created_at`) to support listing and pagination.

## What is intentionally not included

- Seed/demo school data
- API controllers or business logic (later phases)
- Authentication implementation details beyond `password_hash` storage
- Many-to-many blog post categories (one category per post for simplicity; can be extended later)
