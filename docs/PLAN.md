# Plan

Status legend: [ ] todo · [~] in progress · [x] accepted. Each phase stops for the user's OK.

## Phase 1 — Port

### [x] 1. Scaffold — Light
Create the Vite + React 18 + TypeScript (strict) project in the repo root, following SPEC "Stack" and the `src/` layout in SPEC "Architecture" (empty placeholder modules are fine). Add Vitest and ESLint 9 flat config (typescript-eslint, eslint-plugin-react-hooks). npm scripts: `dev`, `build` (`tsc -b && vite build`), `preview`, `test` (`vitest run`), `test:watch`, `lint`. `index.html`: title "Cadence — Weekly Time Balancer", `html, body { margin:0; padding:0; background:#f4ede1 }`, `#root { min-height:100vh }`, the legacy emoji favicon for now. `main.tsx` renders a placeholder in `<React.StrictMode>`. Set `base: "/cadence/"` in `vite.config.ts`. Update `filemap.md`.
Verify: `npm run build`, `npm test` (one trivial test), `npm run lint` all pass.
Depends: none.

### [x] 2. Core logic + tests — Careful
Port the pure logic from `legacy/cadence.html` into `src/lib/` per SPEC "Architecture" and "Data model": constants, `fmtTime`/`fmtDur`, `freeGaps`/`resolvePlacement` (verbatim semantics), a new pure `resizeBlock` extracted from the legacy resize handler, types, `migrateBlocks`/`migrateTemplates`/`normalizeData`, `storage.ts` (five keys, defaults), `transfer.ts` (export envelope + import parse/validate per SPEC "Export / import"), and `actions.ts` with every state transition the UI needs (placeBlock, moveBlock, resize, addTag, removeTag, updateBlock, removeBlock, toggleDone, saveTemplate, applyTemplate, deleteTemplate, advanceWeek, resetStats, updateCat, addCat, removeCat, replaceAll). Actions take `CadenceData` (plus args, plus `activeWeek` where the legacy code uses it) and return new `CadenceData`, never mutating input. `uid` and `Date.now` are injectable for tests. Unit tests per SPEC "Definition of done".
Verify: `npm test` green, `npm run lint`, `npm run build`.
Depends: 1.

### [x] 3. UI port — Careful
`src/styles.ts` (verbatim port of `S`, tokens, `FONT_IMPORT`), `useCadence` hook (load via storage, persist each key on change, expose actions from task 2), and the components in SPEC "Architecture" reproducing legacy rendering exactly (block states: dashed/solid/filled, multi-tag gradient ring with mask-composite, pips, desc/time visibility thresholds, editor). Interactions stay on the HTML5 drag API and mouse events for now (Phase 3 replaces them), but the resize must call `resizeBlock`. Adds the `settings` nav button routed to an empty `SettingsView` (task 4 fills it).
Verify: build, lint, tests; side-by-side with `legacy/cadence.html` in a browser.
Depends: 2.

### [x] 4. Settings: export / import — Medium
Implement `SettingsView` exactly per SPEC "Settings view", using `transfer.ts` and the `replaceAll` action.
Verify: export, edit something, import the file, data restored; import a flat legacy-keys file; import garbage shows the error.
Depends: 3.

## Phase 2 — PWA + deploy

### [x] 5. PWA setup — Careful
vite-plugin-pwa (generateSW, autoUpdate, app-shell precache, navigateFallback), manifest per SPEC Phase 2, self-hosted fonts via @fontsource (replacing the Google Fonts @import), iOS meta tags, viewport-fit=cover, safe-area padding on the root, icon pipeline from `assets/icon.svg` (placeholder until task 7).
Verify: build, lint, tests; `vite preview` shows SW registered, manifest valid, app loads offline.
Depends: Phase 1.

### [x] 6. GitHub Pages workflow — Light
`.github/workflows/deploy.yml`: on push to main, npm ci, test, build, deploy `dist` with the official Pages actions.
Verify: YAML lint-clean; build command matches package.json.
Depends: Phase 1.

### [x] 7. Final icons — dropped: user picked design A, which is the placeholder art (no text), so task 5's icons are final
Replace the placeholder `assets/icon.svg` with the design the user picked (text converted to paths), regenerate all icon sizes.
Verify: PNGs render correctly at 180, 192, 512 and favicon sizes.
Depends: 5, user's icon choice.

## Phase 3 — Mobile (design approved, see SPEC "Phase 3 design")

### [x] 8. Touch interaction engine — Heavy
Replace HTML5 drag and mouse resize with a Pointer Events engine per SPEC "Interaction engine", "Press / hover feedback", "Tap-to-place", "Resize", "Editor additions", "No zoom". Works in the current 7-column grid on all widths.
Verify: unit tests for pure gesture maths; build/lint/tests; browser at desktop width (mouse) and mobile emulation (touch): pickup, move, tray drop, tag drop, tap-to-place, resize, autoscroll, cancel.
Depends: Phase 2.

### [x] 9. Phone day view — Medium
Per SPEC "Phone layout": day strip, single column, 40px rows, swipe, default day; editor day chips follow the block.
Verify: mobile emulation screenshots; desktop unchanged.
Depends: 8.

## Phase 4 — Sync (see SPEC "Phase 4 design")

### [x] 10. Sync engine + schema + setup guide — Careful
`supabase/schema.sql`, `.env.example`, Supabase client (null when env missing), `cadence:meta` handling and edit-time bumping, pure sync decision functions with tests, a `useSync` hook exposing status/session/actions (sendCode, verifyCode, signOut, resolveConflict), workflow env vars, and `docs/SUPABASE_SETUP.md` click-through guide for the user.
Verify: unit tests with a fake client; build/lint; app still runs local-only without env.
Depends: Phase 3.

### [x] 11. Sync UI — Medium
Header status, Settings "Account & sync" (signed out / code entry / signed in), conflict card + calendar banner, per SPEC "UI".
Verify: browser with a faked sync state; real end-to-end once the user's project exists.
Depends: 10.

## Phase 5 — Handoff

### [x] 12. Migration file — Medium
`handoff/cadence-export.html`: a copy of `legacy/cadence.html` with only an "Export my data" button added; downloads the same envelope as `buildExport` from the five localStorage keys.
Verify: seeded legacy data exports, and the file imports into the new app with zero skipped entries.
Depends: Phase 4.

### [x] 13. README + install note — Light
`README.md` and `handoff/INSTALL-IPHONE.md` (one page for the user's friend).
Depends: Phase 4.

## Post-launch (see SPEC "Post-launch changes")

### [x] 14. Hide tray + solid block backgrounds — Light
Depends: none.

### [x] 15. Tasks tab — Careful
Data model + storage + normalize + export/import + sync document + actions + TasksView + nav.
Depends: none (runs alongside 14; does not touch Sidebar.tsx or Block.tsx).

## Sprint 0 — Pre-sale page, due 2026-11-15 (see `docs/BRIEF-sprints-0-1.md`)

Plan approved 2026-11-04. Site repo: `D:\Custom Apps\cadence-site` (local git, no remote yet; renamed `{{APP_NAME}}-site` once the name is picked).

### [~] S0.1 Site repo scaffold + i18n — Medium
`{{APP_NAME}}-site` repo: static Vite site (no React runtime needed), FR/EN pages with French default for Quebec, translation files, self-hosted fonts and clip placeholder, Pages workflow, custom domain once DNS exists.
Done: Vite + TS site, build-time FR/EN render, root language redirect, self-hosted fonts, Pages workflow, tests for language/headline/source/waitlist/translations. Left: GitHub repo + custom domain.
Depends: JP's OK. Blocked for the domain on: name + DNS (Nov 8).

### [~] S0.2 Landing page — Medium
Hero (A/B headline in session storage), how it works, offer, waitlist form, FAQ, footer, per `docs/wireframes/landing-*.png`. Reduced motion, Lighthouse a11y 90+, no third-party requests except checkout.
Done: all sections from the wireframes in both languages, A/B headline, waitlist client checks. Left: wire waitlist (S0.3) and checkout (S0.4), real clip, Lighthouse run.
Depends: S0.1.

### [~] S0.3 Supabase tables + `hits` + `waitlist` functions — Careful
`purchases`, `entitlements`, `waitlist`, `hits` tables (RLS: no public reads), edge functions with input validation, `?src=` / referrer source logic as pure tested functions, tagged link list.
Done (site repo): `supabase/presale.sql`, `hit` + `waitlist` edge functions with tested rules/handlers, page wiring (beacon hit, signup with consent version), `npm run links`, `supabase/SETUP.md`. Checked end to end against a local mock of the functions. Left: JP runs SETUP.md (region check, SQL, deploy, variables); confirmation email waits on an email tool.
Depends: JP's OK. Flag: Supabase region (Canada).

### [ ] S0.4 Checkout adapter + webhook — Careful
Thin provider adapter (Paddle or Lemon Squeezy), overlay checkout in visitor's language, webhook signature check, purchase + entitlement write, refund handling, thank-you page.
Depends: S0.2, S0.3. Blocked on: merchant approval + test keys (Nov 5).

### [~] S0.5 Scoreboard — Medium
Private view for JP: weekly visitors, signups, purchases by headline and source, plus rates. Aggregation as pure tested functions.
Done (site repo): `scoreboard` function behind `SCOREBOARD_TOKEN` (counts only), `/scoreboard/` page in FR/EN, visits counted once per browser session; checked in the browser against sample data. Left: compare with the launch plan's scoreboard (not seen yet); live once JP runs SETUP.md.
Depends: S0.3.

### [~] S0.6 Legal pages, French first — Medium
Terms, Privacy, Refunds, What lifetime means; drafts with `[SELLER]`, `[SYNC TERM]`, `[NOTICE]` placeholders for JP's review.
Done (site repo): all four pages in FR (official) and EN, shared header/footer, EN pages link to the French first, tests for matching keys/tokens. Left: JP works through `docs/LEGAL-REVIEW.md` (placeholders, proposed refund terms, Law 25 commitments) and approves the copy.
Depends: S0.1. Blocked for final copy on: JP's decisions (Nov 10) and review (Nov 14).

### [ ] S0.7 End-to-end check — Light
Test-mode then live purchase + refund in FR and EN, waitlist signup, hit counts, scoreboard totals.
Depends: all of the above; JP's live purchase (Nov 14).

## Sprint 1 — No-regret features, 2026-11-16 to 2026-12-20 (see brief)

Each ships to JP's friend as it lands, in this order. Every storage change: JSON export first, migration tested on real-shaped data.

### [~] S1.1 A tick on every block — Medium
Shipped to main 2026-11-04.
Round tick on every block (bigger on touch), done = area tint, Now ring + minutes left, current-time line; SPEC "Sprint 1 changes". No stored-data change. Checked in the browser at desktop and phone sizes with emulated taps. Left: JP's OK, then real iPhone check after deploy.
### [~] S1.2 Guardrail quotas (floor / ceiling / range; quotas migrate to floors) — Careful
Done on branch `s1-guardrails`: `limit` on categories with lossless migration and a pre-migration copy (Settings download), balance maths + wording (tested), sidebar balance, guardrail picker. Real backup checked. Shipped to main 2026-11-04. Buffer block done on branch `s1-buffer` (tray item, no area, fills when an area is dropped on it, kept by templates). Buffer shipped to main 2026-11-04.
### [~] S1.3 Balanced weeks instead of daily streaks — Medium
Done on branch `s1-balanced-weeks`: judged from ticked history by calendar week, all balanced weeks this season (JP's choices), grace squares, rules in Settings (device-local), card in sidebar and Stats. Shipped to main 2026-11-04.
### [x] S1.4 One panel for areas and tasks (desktop panel, phone tray with tabs)
Done on branch `s1-panel`: desktop left panel (area drag handles with balance bars, buffer, notes, tasks; hideable), week bar above the grid, templates and roll forward below it, phone tray docked at the bottom with Areas/Tasks tabs and a slim folded bar (device-local). Tasks view folded into the panel. Per-area task folds come with S1.5. Shipped to main 2026-11-04.
### [x] S1.5 Tasks (first under areas, then one plain list) (schema v2; migrates the current Tasks tab's area-less tasks)
Done on branch `s1-tasks`: schema 2 tasks with migration (old tasks → Unsorted, JP's choice) and a pre-migration copy, drop on block / on empty time, one tick for a single-task block, tasks come back when a block is ticked or ends, done this week, no estimates (JP's call), per-area folds, phone Tasks tab grouped by area. Real backup checked (it predates tasks: zero drops, stable). Shipped to main 2026-11-04.
Changed on branch `s1-task-list` (JP, 2026-11-04): tasks are one plain list apart from the areas; they go into blocks only and show the block's colour dots there. Shipped to main 2026-11-04.
### [~] S1.6 Click or tap empty time to add (JP: armed tap stays; window when nothing is armed)
Done on branch `s1-slot-menu`: window beside the slot (desktop), bottom sheet (phone), lengths + areas + buffer, no tasks (JP), closes with nothing changed. Also the current-time line now sits above the blocks (JP). Left: JP's OK, ship.
Note: tasks have no estimates (JP, 2026-11-04), so a task picked there makes a block of the chosen length or its area's usual block, not "from its estimate".
### [ ] S1.7 Welcome back
### [ ] S1.8 Starter templates
### [ ] S1.9 French and English
### [ ] S1.10 Neutral stats copy
### [ ] S1.11 Early-bird badge
