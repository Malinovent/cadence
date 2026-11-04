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
