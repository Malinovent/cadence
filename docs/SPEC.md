# Cadence 2.0 — Spec

Source brief: `docs/BRIEF.md`. Original app: `legacy/cadence.html` (read-only reference; app code starts at line 315).

## Goals
- Port Cadence to a Vite + React + TypeScript project with identical behaviour, look and voice.
- Installable PWA (iPhone via Safari "Add to Home Screen", desktop browsers), works offline.
- Touch-friendly interactions and a phone layout.
- Single-user sync between devices through Supabase, local-first.
- Lossless migration of the existing localStorage data.

## Non-goals
App Store / Capacitor, push notifications, multi-user or sharing, calendar integrations. Code must stay Capacitor-friendly (no hard dependency on browser-only globals outside `src/lib/storage.ts` and the PWA layer).

## Stack
- Node 24, npm 11
- Vite 6, React 18.3, TypeScript 5 (strict)
- Vitest 3 (+ jsdom only where a test needs the DOM)
- ESLint 9 flat config (typescript-eslint, react-hooks)
- Phase 2: `vite-plugin-pwa`, `@fontsource` packages for Fraunces + Spline Sans Mono (self-hosted for offline)
- Phase 4: `@supabase/supabase-js` v2
- Hosting: GitHub Pages via a GitHub Actions workflow, repo `Malinovent/cadence`, URL `https://malinovent.github.io/cadence/` (Vite `base: "/cadence/"`). HTTPS by default, no extra account, and magic-link redirects work with a fixed URL. Netlify/Vercel would only save the workflow file, so not worth another account.

## Architecture

```
src/
  main.tsx              mount <App/>
  App.tsx               header + nav + view switch
  styles.ts             S.* style objects, tokens (ink, paper, paper2, line), FONT_IMPORT — ported verbatim
  lib/
    constants.ts        DAYS, DAY_START, DAY_END, ROW_H, STEP (30), SNAP_THRESHOLD, DEFAULT_CATEGORIES, PALETTE
    time.ts             fmtTime, fmtDur
    placement.ts        freeGaps, resolvePlacement, resizeBlock (pure)
    model.ts            types, migrateBlocks, migrateTemplates, normalizeData
    actions.ts          pure state transitions: CadenceData -> CadenceData
    storage.ts          localStorage load/save (the five keys)
    transfer.ts         export envelope build, import parse + validate
    uid.ts              uid()
  state/
    useCadence.ts       React hook: holds CadenceData, persists it, exposes actions
  components/
    Header.tsx, Sidebar.tsx (tray, quotas, completion, templates, roll forward),
    WeekGrid.tsx, Block.tsx, BlockEditor.tsx,
    StatsView.tsx, CategoriesView.tsx, SettingsView.tsx
```

Rules:
- All data logic lives in `src/lib/` as pure functions with unit tests. Components contain no business rules, only rendering and event wiring.
- **No side effects inside React state updaters.** The legacy `toggleDone` calls `setHistory` inside a `setWeeks` updater; under StrictMode that logs history twice. In the port, `toggleDone` is one pure action returning new `weeks` and `history` together.
- UI-only state (active week, view, editing id, stats range, template naming, reset confirm) stays in components / App, not in `CadenceData`.

## Data model

```ts
type Category = { id: string; name: string; color: string; targetMins: number; blockMins: number };
type Block = { id: string; catIds: string[]; day: number /*0=Mon..6*/; start: number /*mins from 00:00*/;
               mins: number; label: string; desc: string; done: boolean };
type Template = { id: string; name: string; blocks: Omit<Block, "id" | "done">[] };
type HistoryEntry = { id: string /*block id*/; catId: string; mins: number; date: number /*ms epoch*/ };
type Streaks = Record<string, { count: number; lastWeek?: number }>;
type CadenceData = { schemaVersion: 1; cats: Category[]; weeks: [Block[], Block[]];
                     templates: Template[]; history: HistoryEntry[]; streaks: Streaks };
```

localStorage keys stay exactly as today: `cadence:cats`, `cadence:weeks`, `cadence:templates`, `cadence:history`, `cadence:streaks` (same JSON shapes). Missing keys fall back to defaults (`DEFAULT_CATEGORIES`, `[[],[]]`, `[]`, `[]`, `{}`). Loaded data always runs through `normalizeData` (which applies `migrateBlocks` / `migrateTemplates`).

Note: history entries carry the block `id` (the brief omits it). It is what un-marking and deleting use to remove entries; keep it.

## Behaviour to preserve (reference: legacy line numbers)
- Grid: Mon–Sun, 7:00–23:00, 30-min rows of 26 px, two weeks (Week 1 / Week 2 toggle).
- Placement: `resolvePlacement` (394) for tray drops and moves; may shrink to fit; null = no-op.
- Resize: top/bottom edge, clamped by neighbours and day bounds (684–715). Extract as `resizeBlock(blocks, id, edge, origStart, origMins, deltaSlots)`.
- Tag add/remove, at least one tag (558–577). Drop a tray category on a block adds a tag.
- Inline editor: title, description, category chips, done button; closes on outside pointerdown, Enter, Escape (501–513, 1172–1221).
- Right-click a block deletes it and its history entries (578).
- Done toggle logs one history entry per tag with full duration; un-done removes by block id (605).
- Quotas: placed minutes vs target per category, multi-tag counts fully to each; completion % = done blocks / blocks (722–737).
- Templates save (default name "Template N") / apply (replaces active week, fresh ids, not done) / delete.
- Roll forward: streak +1 if week-1 done minutes ≥ target else 0; weeks become `[week2, []]`; active week resets to Week 1.
- Stats: month/quarter/year (30/90/365 days), hours and sessions per category, streak cards, reset with confirm (also clears done flags).
- Categories editor: name, hours/week (0.5 step), block hrs (min 0.5, snapped to 30 min), color, delete (strips tag, drops untagged blocks, drops its history), add (palette cycle).

## Export / import (Phase 1)
Export envelope, filename `cadence-backup-YYYY-MM-DD.json`:
```json
{ "app": "cadence", "schemaVersion": 1, "exportedAt": "<ISO>", "data": { "cats": [], "weeks": [[],[]], "templates": [], "history": [], "streaks": {} } }
```
Import accepts (a) that envelope, (b) a flat object keyed by the five localStorage keys (values either parsed or JSON strings). It then:
- rejects non-JSON, a non-object, or a file with no recognisable Cadence keys (clear error message);
- normalizes: `migrateBlocks`/`migrateTemplates`, pads/trims `weeks` to 2, drops blocks with invalid day/start/mins, strips unknown catIds (drops blocks left untagged), drops malformed categories/history entries; counts what it dropped;
- shows a summary and asks to confirm, then **replaces** all local data.

The same envelope is what `cadence-export.html` (Phase 5) will download.

## Settings view (Phase 1 design)
Fourth nav button `settings` after `categories`, same `navBtn` style. Body uses `catBody` width (720).
- `h2` "Your data" (`statsTitle` style), intro (`catIntro` style): "Keep a copy of your weeks, or bring them in from another browser."
- Two buttons in a row, `catAdd` style (dashed ink border): "↓ Export my data" and "↑ Import from file" (the second opens a hidden `<input type="file" accept=".json,application/json">`).
- After a file is chosen: a card (`streakCard` colours, left-aligned, padding 14) with the summary in `catIntro` text, e.g. "4 categories · 12 blocks across both weeks · 2 templates · 37 logged sessions · 3 streaks." If anything was dropped, a second line in `#9a8d7d` italic: "Skipped 2 entries that didn't look right." Then the line "This replaces everything in Cadence on this device." in `resetWarn` style, and buttons "Yes, replace" (`resetConfirm` style but background `#1FA98A`) and "Cancel" (`resetCancel`).
- Errors: one italic line in `#b54`, e.g. "That file doesn't look like a Cadence backup."
- Success: italic `#1FA98A` line "Imported. Your week is back." which clears on the next action.
- Phase 4 will add an "Account & sync" section under this one.

## Phases
1. Port + export/import + unit tests (this file's sections above).
2. PWA + deploy: manifest, icons (incl. 180×180 apple-touch-icon, replace the emoji favicon), iOS meta tags, `viewport-fit=cover` + safe-area padding, service worker app-shell cache, self-hosted fonts, GitHub Pages workflow.
3. Mobile: Pointer Events drag/move/resize with long-press pickup on touch, tap-to-place, ≥44 px targets, no zoom on double-tap/focus, phone layout (one day + Mon–Sun strip, compact quota summary). User decisions (after testing on Android): on narrow screens the week toggle and the tray (compact 2-column grid) sit directly ABOVE the calendar so drags are short; targets, completion, templates and roll forward go BELOW the calendar. No bottom sheet. Shipped below 900px in Phase 2 (CSS order in styles.ts FONT_IMPORT). Note: HTML5 drag already works by long-press in Android Chrome. Design mockups shown before build.
4. Sync: Supabase magic link, `cadence_state` table with RLS, local-first debounced push, pull on launch/visibility, last-write-wins on whole doc, sync status + sign-out, first-sign-in merge choice. User click-through guide.
5. Handoff: `cadence-export.html`, README, iPhone install note.

## Definition of done (Phase 1)
- `npm run dev` shows the app looking the same as `legacy/cadence.html` side by side, and every feature in "Behaviour to preserve" works with the mouse.
- Data written by the old app (same five keys) loads unchanged, including pre-`catIds` blocks.
- Export then import round-trips with no loss; a legacy-key-shaped file imports too.
- `npm test`, `npm run lint`, `npm run build` pass. Unit tests cover time formatting, `freeGaps`, `resolvePlacement` (snap, shrink, nearest gap, full day), `resizeBlock`, migrations, import validation, and the key actions.
