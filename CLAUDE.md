# Cadence

Vite + React 18 + TypeScript (strict), Vitest, ESLint 9. Windows dev machine, npm.

## Commands
- `npm run dev` — dev server (served under `/cadence/`)
- `npm test` — unit tests (Vitest, run once)
- `npm run lint`
- `npm run build` — typecheck + production build

## Conventions
- `legacy/cadence.html` is the behavioural and visual reference. Never edit it. App code starts at line 315.
- Look and voice must match the legacy app: styles live in `src/styles.ts` as `S.*` objects; reuse them, don't invent new tokens or copy without a spec.
- Business logic only in `src/lib/` as pure, unit-tested functions; components render and wire events.
- Never call a state setter or any side effect inside a React state updater function.
- localStorage keys `cadence:cats|weeks|templates|history|streaks` keep their legacy shapes; all loaded or imported data goes through `normalizeData`.
- Never commit secrets; config goes in `.env.local` (gitignored) with keys listed in `.env.example`.
- When you add or move files, update `filemap.md`.

## Docs
- `docs/SPEC.md` — architecture, data model, behaviour, designs
- `docs/PLAN.md` — tasks and status
- `docs/BRIEF.md` — the original request
- `filemap.md` — where things live
