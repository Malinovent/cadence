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

## Phase 2 — PWA + deploy (planned after Phase 1 approval)
## Phase 3 — Mobile (design mockups first)
## Phase 4 — Sync
## Phase 5 — Handoff
