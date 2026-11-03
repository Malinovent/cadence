# Cadence

*Balance the week before the week balances you.*

Cadence is a two-week planner for balancing time across categories (work, rest, people, projects…) against weekly quotas.

**Live:** https://malinovent.github.io/cadence/

## Features

- Two-week grid; drag or tap to place blocks
- Multi-category blocks and per-category weekly quotas
- Templates, roll forward to the next week, streaks
- Stats view
- Export / import (JSON backup)
- Installable PWA that works offline
- Phone day view with touch drag, resize and swipe between days
- Optional sync between devices via Supabase (email code sign-in)

## Development

Requires Node 24.

```sh
npm install
npm run dev     # http://localhost:5173/cadence/
npm test        # Vitest unit tests
npm run lint    # ESLint
npm run build   # type-check + production build to dist/
npm run icons   # regenerate public/ icons from assets/icon.svg
```

Windows: if PowerShell blocks `npm.ps1`, run `npm.cmd` instead (e.g. `npm.cmd run dev`).

## Sync configuration

Copy `.env.example` to `.env.local` and fill in `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`. Full backend setup (project, schema, auth emails,
GitHub variables) is in [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md).
Without these variables the app runs local-only and hides sign-in.

## Deploy

Pushing to `main` runs GitHub Actions, which builds and publishes to GitHub Pages.
Set the repository **Variables** `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
(Settings → Secrets and variables → Actions → Variables) to enable sync in the deployed build.

## Moving data from the old single-file app

1. Open `handoff/cadence-export.html` from the same place the old `cadence.html`
   was opened (same browser, same folder or address), so it can read the same saved data.
2. Click **↓ Export my data** — a `cadence-backup-….json` file is saved.
3. In the new app, go to **Settings** → **↑ Import from file**, choose that file, then **Yes, replace**.

## More

- [docs/SPEC.md](docs/SPEC.md) — architecture, data model, behaviour
- [docs/PLAN.md](docs/PLAN.md) — task list and status
- [filemap.md](filemap.md) — where everything lives
- [CLAUDE.md](CLAUDE.md) — rules and commands for coding agents
- `legacy/cadence.html` — the original single-file app, kept as read-only reference
