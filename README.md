# acta

Personal iPhone-friendly todo PWA. Offline-first, cloud-synced, with push reminders. Deployed at **https://todo.andrewcromar.org**.

Named "acta" — Latin / Greek for "things done". Not open for contributions — just my own thing.

## Stack

- **Next.js 16** (App Router, Turbopack) + TypeScript + Tailwind v4
- **Neon Postgres** via Drizzle ORM (`drizzle-kit push` for migrations)
- **Dexie.js** for local IndexedDB — the app is offline-first; the server is the canonical copy and the client reconciles on a 30s + focus sync loop
- **web_auth** (auth.andrewcromar.org) for passwordless email-code login; session cookie is scoped to `.andrewcromar.org` and shared across subdomains
- **web-push** + hand-written service worker for PWA reminders; schedule triggered externally via cron-job.org
- **chrono-node** for natural-language due date parsing in the add-todo title
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
  components/           Client components (TodoArea, AddTodo, TodoItem, TagInput, ThemeToggle, …)
  lib/
    auth.ts             getUser() server-side, validates session with web_auth
    db.ts               Dexie (local IndexedDB)
    db-server.ts        Neon HTTP client
    schema.ts           Drizzle schema
    sync.ts             offline-first reconciliation (todos, tags, prefs)
    prefs.ts            user prefs (sort mode etc.)
    recurrence.ts       rule parsing + next-occurrence math for repeating todos
    tags.ts             tag + todo-tag client helpers
    todos.ts            client-side mutation helpers
public/
  sw.js                 service worker (push handler, notification actions)
  icon-light.svg        checkmark icon (light variant — for light browser theme)
  icon-dark.svg         checkmark icon (dark variant — apple-touch-icon and PWA)
AGENTS.md               notes for Claude Code when working on this repo
```

## Features

- Offline-first: edit todos while offline, they sync when the tab has connectivity
- Expand-on-click detail view with title, description, due date, recurrence rule, tags
- Natural-language due dates in the quick-add ("dentist tuesday 4pm" → sets due)
- Sort by created / due / alphabetical — synced per-user across devices
- Completed section is collapsible, paginated, clearable
- Repeating todos: daily / weekly / monthly / yearly with optional end date
- Tags with autocomplete + filter chips in the toolbar
- Light / dark / system theme toggle
- Push notifications for upcoming due dates + "Mark complete" action on the notification

## Notes for future-me

- `main` is prod; Vercel auto-deploys.
- No branch protection. Feature branches named `feat/*`, fast-forward merges only.
- Schema changes run through `drizzle-kit push` (not a migration file) because this is a personal project and I don't care about rollback.
- `AGENTS.md` / `CLAUDE.md` at the repo root are read by Claude Code.
