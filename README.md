# todo_app

Personal iPhone-friendly todo PWA. Offline-first, cloud-synced, with push reminders. Deployed at **https://todo.andrewcromar.org**.

Not open for contributions — just my own thing. Rebrand to `acta` is planned (see issue #21).

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind v4
- **Neon Postgres** via Drizzle ORM (`drizzle-kit push` for migrations)
- **Dexie.js** for local IndexedDB — the app is offline-first; the server is the canonical copy and the client reconciles on a 30s + focus sync loop
- **web_auth** (auth.andrewcromar.org) for passwordless email-code login; session cookie is scoped to `.andrewcromar.org` and shared across subdomains
- **web-push** + hand-written service worker for PWA reminders; cron triggered externally via cron-job.org
- Deployed on Vercel, DNS via Cloudflare

## Dev

Requires Node 20+ and an `.env.local` (not checked in) with:

```
DATABASE_URL=postgres://...@neon.tech/...
NEXT_PUBLIC_AUTH_BASE_URL=https://auth.andrewcromar.org
NEXT_PUBLIC_VAPID_PUBLIC_KEY=...
VAPID_PRIVATE_KEY=...
VAPID_SUBJECT=mailto:you@example.com
CRON_SECRET=...
```

```bash
npm install
npm run dev       # next dev
npm run db:push   # apply schema changes to Neon (loads .env.local automatically)
npm run build
```

## Repo layout

```
src/
  app/                  App Router routes (pages + /api)
  components/           Client components (TodoArea, AddTodo, TodoItem, ...)
  lib/
    auth.ts             getUser() server-side, validates session with web_auth
    db.ts               Dexie (local IndexedDB)
    db-server.ts        Neon HTTP client
    schema.ts           Drizzle schema
    sync.ts             offline-first reconciliation
    prefs.ts            user prefs (sort mode etc.)
    todos.ts            client-side mutation helpers
public/
  sw.js                 service worker (push handler, notification actions)
AGENTS.md               notes for Claude Code when working on this repo
```

## Notes for future-me

- `main` is prod; Vercel auto-deploys.
- No branch protection. Feature branches named `feat/*`, fast-forward merges only.
- Schema changes run through `drizzle-kit push` (not a migration file) because this is a personal project and I don't care about rollback.
- `AGENTS.md` / `CLAUDE.md` at the repo root are read by Claude Code.
