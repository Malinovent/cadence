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

## Phase 3 design (approved)
Breakpoint: "phone" = viewport width < 900px (same as the Phase 2 stacking CSS). Touch-specific affordances key off `(pointer: coarse)` / `pointerType === "touch"`, not width.

### Phone layout
- Order: week toggle → tray (2×2) → calendar → targets, completion, templates, roll forward (already shipped via CSS order).
- Calendar shows ONE day. The head row becomes a Mon–Sun strip: 7 equal buttons, Fraunces 600 11–14px, active = ink background / paper text, others transparent; a 4px dot (`#9a8d7d`, paper on active) under days that have blocks in the active week. Strip sits inside `S.gridWrap`, bottom border `1.5px solid ink`.
- Body: time column 52px + one day column (no `minWidth: 700`). Row height on phone `ROW_H_PHONE = 40` (desktop stays 26). All y→slot maths take the row height as a parameter.
- Switch day: tap the strip, or horizontal swipe on the grid body (|dx| > 50px and |dx| > 1.5·|dy|, not during a drag/resize).
- Default day: today's weekday (Mon=0) when Week 1 is active, Mon for Week 2. Switching weeks keeps the chosen day.

### Interaction engine (Pointer Events, all devices; replaces HTML5 drag + mouse resize)
- Sources: tray item (new block), placed block (move), tray item dropped onto a block (add tag), resize grips.
- Mouse/pen: drag starts after 4px of movement (no delay). Touch: long-press 350ms with < 8px movement starts the drag; moving earlier cancels it and lets the page scroll. Once dragging, a non-passive `touchmove` listener calls `preventDefault` so iOS does not scroll; released on end/cancel.
- While dragging: a ghost (copy of the item, `box-shadow: 3px 3px 0 rgba(0,0,0,0.2)`, `rotate(-1.5deg)`, opacity 0.95, pointer-events none) follows the pointer; for moves the original stays in place at opacity 0.35. A drop preview (dashed `1.5px ink` outline, radius 4) shows the exact `resolvePlacement` result under the pointer; hidden when the result is null or the pointer is outside the grid. Hovering a block with a tray item highlights that block (outline `2px solid` category colour) instead of showing a preview: dropping adds the tag.
- Auto-scroll the window when the pointer is within 60px of the viewport top/bottom (speed proportional to depth, max ~16px/frame).
- Drop outside the grid or `pointercancel` = no change. Escape cancels on desktop.
- Haptic: `navigator.vibrate?.(10)` on long-press pickup.
- Long-press must not trigger the context menu, text selection or iOS callout on blocks/tray (`-webkit-touch-callout: none`, `user-select: none`, `contextmenu` preventDefault while a press is active). Desktop right-click on a block still deletes it.
- A tap (no drag) on a block opens the editor as today; a tap on the done toggle toggles done.

### Press / hover feedback on tray items (user request)
- Hover (mouse only, `(hover: hover)`): background = category colour at ~10% alpha (hex + `1a`), cursor `grab`.
- Press (any pointer, on pointerdown): `transform: scale(0.97)`, background colour at ~15% (`26`), transition 120ms.
- Touch hold progress: during the 350ms long-press a fill (category colour at ~25%, `40`) grows left→right inside the item (absolute layer, `transform: scaleX(0→1)`, origin left, linear 350ms). Cancelled → resets instantly.
- Picked up: item returns to normal, the ghost appears, vibrate.
- Same press feedback on placed blocks: pointerdown `scale(0.98)`; on pickup the original fades to 0.35.

### Tap-to-place
- Tap (no long-press, no drag) on a tray item arms it: item shows filled (background category colour, text `#fff`, solid border); the "Drag into the grid" label reads "Tap a slot to place · tap again to cancel". Tapping it again, another tray item (switches), Escape, or changing view/week disarms.
- While armed, tapping an empty spot in a day column places a block there (start from tap y, `placeBlock` rules). Tapping an existing block while armed adds the tag. One placement, then the tray disarms.
- Works on desktop too (click to arm), harmless.

### Resize
- Touch (`pointer: coarse`): visible grips on every block: 22×4px rounded bar in the block's base colour (white on filled blocks), centred on the top and bottom edges. Hit area 44px tall centred on the edge (22px outside the block), above the block body in z-order; for blocks shorter than 88px the inner half of each hit area is reduced so at least the middle 40% of the block stays free for tap/hold.
- Mouse: the existing invisible 7px edge handles with `ns-resize` cursor.
- Resizing uses pointer capture, `resizeBlock` with the current row height, and starts immediately on touch (no long-press) because grips are explicit targets.

### Editor additions (touch only, `(pointer: coarse)`)
- A "delete" button (`S.editDone` shape, background `#b54`) to the left of "done"; deletes the block (`removeBlock`).
- A day row: 7 small chips (`S.chip` style, ink border; current day filled ink) "Mon"…"Sun"; tapping moves the block to that day at the same start via `moveBlock` (may shrink/shift to fit; no-op if full). On phone, the view follows the block to the new day.

### No zoom
- `touch-action: manipulation` on html/body (kills double-tap zoom, keeps pinch zoom).
- On `(pointer: coarse)`, all inputs/textarea `font-size: 16px` (prevents iOS focus zoom).

## Phase 4 design: sync (approved scope from brief)

### Backend (Supabase, free tier)
- Table `public.cadence_state (user_id uuid primary key references auth.users on delete cascade, data jsonb not null, updated_at timestamptz not null)`. RLS enabled; policies: select/insert/update only where `user_id = auth.uid()`. No delete policy.
- `updated_at` is the CLIENT's last-edit time of the document (not `now()`), so last-write-wins compares edit times across devices.
- Writes go through `public.push_state(p_data jsonb, p_updated_at timestamptz) returns table(data jsonb, updated_at timestamptz)`, `security invoker`: insert the caller's row, or update it only if the stored `updated_at` is older than `p_updated_at`; always returns the row that is now stored (ours if we won, the newer server one if we lost). Atomic LWW, so an offline device can't overwrite a newer copy.
- SQL lives in `supabase/schema.sql` (idempotent: `create table if not exists`, `create or replace function`, `drop policy if exists` + create).
- `data` = `{ schemaVersion: 1, cats, weeks, templates, history, streaks }` (same as the export envelope's data plus schemaVersion). Anything pulled goes through `normalizeData`.

### Auth
- Supabase email OTP via `signInWithOtp({ email, options: { emailRedirectTo: <app url>, shouldCreateUser: true } })`.
- iOS caveat: a home-screen PWA does not share storage with Safari, so a magic LINK opened from Mail signs in Safari, not the installed app. Therefore the email contains BOTH the link and a numeric code, 6–10 digits per project setting (custom email template using `{{ .Token }}`), and the app offers a code field (`verifyOtp({ email, token, type: "email" })`). The link still works on desktop/when opened in the same browser (`detectSessionInUrl`).
- Session persisted by supabase-js in localStorage (key prefix `sb-`), auto refresh on.
- Env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` (the project's public anon / publishable key — designed to be public; RLS protects data). `.env.example` lists them; `.env.local` (gitignored) holds them for dev; GitHub repository VARIABLES feed the Pages build. If either is missing, the app runs local-only and hides all account UI.

### Local metadata
- New key `cadence:meta` = `{ updatedAt: number /*ms, last local edit*/, syncedAt: number | null /*updatedAt value last confirmed equal to the server*/, userId: string | null }`.
- Every user edit bumps `updatedAt = Date.now()`. Loading from storage and applying a pulled server copy do NOT bump it (applying sets `updatedAt = syncedAt = server updated_at`).
- "Dirty" = `syncedAt !== updatedAt`.

### Sync rules (pure decision functions, unit-tested)
- Signed out: local-only, nothing else changes.
- Push: when signed in and dirty, debounce 1.5s after the last edit, call `push_state(local, updatedAt)`. If the returned `updated_at` equals ours → `syncedAt = updatedAt`. If it is newer → the server won: apply the returned copy.
- Pull: on launch (after session restore), on `visibilitychange` to visible, on `online`, and right after sign-in: select own row. Decide:
  - no row → push local (first upload).
  - server.updated_at > local.updatedAt → apply server.
  - server.updated_at < local.updatedAt → push (we're newer).
  - equal → mark synced.
- First sign-in on a device (meta.userId !== session user id) with a server row: if local data is "empty" (no blocks in either week, no templates, no history, no streaks, cats equal to defaults) → apply server silently; if server and local content are deep-equal → mark synced; otherwise ASK (see UI). Then store `meta.userId`.
- Signing in as a different user than meta.userId: same as first sign-in.
- Sign out: keep local data on the device, clear session, `meta.userId = null`, `syncedAt = null`.
- Errors/offline: keep data local, status "offline" (navigator.onLine false or fetch failure), retry on next trigger (online, visibility, next edit). Never lose local edits.

### UI
- Header status (only when sync is configured AND signed in): under the nav, right-aligned, `Spline Sans Mono` 10px, color `#9a8d7d`, uppercase letter-spacing 0.08em, a 6px dot before the text: `synced` (dot #1FA98A), `syncing…` (dot #C9A227), `offline` (dot #cabfb2), `sync error` (dot #b54). Clicking it opens Settings. On phones it wraps under the nav.
- Settings → new section under "Your data", same styles: `h2` "Account & sync".
  - Signed out: intro `S.catIntro` "Sign in with your email to keep your weeks in sync between your phone and computer. No password." An email input (`S.tplNameInput` style, type email, autocomplete email) + button "Send me a code" (`S.catAdd` style). After sending: text "Check your email. Tap the link, or type the code here:" + code input (inputmode numeric, autocomplete one-time-code, maxlength 10) + "Sign in" (`S.resetConfirm` style with background #1FA98A) + small "Use a different email" text button. Errors in `#b54` italic 13px ("That code didn't work. Try again or ask for a new one.").
  - Signed in: "Signed in as <email>." + the current status line ("Everything's synced." / "Saving changes…" / "Offline. Changes are saved on this device and will sync later.") + "Sign out" (`S.resetCancel` style).
  - Conflict prompt (first sign-in, both sides have different data): card in `S.streakCard` colours left-aligned: "This device and your account both have a schedule." then two summary lines using the import summary sentence for each side ("On this device: …" / "In your account: …"), then buttons "Keep this device's" (`S.resetConfirm` with #1FA98A) and "Use my account's" (`S.resetCancel`). Until chosen, no push/pull happens. The prompt also shows as a banner at the top of the calendar view ("Choose which schedule to keep →" link to Settings) so it isn't missed.

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
