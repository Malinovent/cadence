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
    Header.tsx, AreasPanel.tsx + PhoneDock.tsx (areas and tasks; S1.4), WeekBar.tsx, WeekFooter.tsx,
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
type CadenceData = { schemaVersion: 2 /* 1 before S1.5 */; cats: Category[]; weeks: [Block[], Block[]];
                     templates: Template[]; history: HistoryEntry[]; streaks: Streaks };
```

localStorage keys stay exactly as today: `cadence:cats`, `cadence:weeks`, `cadence:templates`, `cadence:history`, `cadence:streaks` (same JSON shapes). Missing keys fall back to defaults (`DEFAULT_CATEGORIES`, `[[],[]]`, `[]`, `[]`, `{}`). Loaded data always runs through `normalizeData` (which applies `migrateBlocks` / `migrateTemplates`).

Note: history entries carry the block `id` (the brief omits it). It is what un-marking and deleting use to remove entries; keep it.

## Behaviour to preserve (reference: legacy line numbers)
- Grid: Mon–Sun, 7:00–23:00, 30-min rows of 26 px, two weeks (Week 1 / Week 2 toggle).
- Placement: `resolvePlacement` (394) for tray drops and moves; may shrink to fit; null = no-op.
- Resize: top/bottom edge, clamped by neighbours and day bounds (684–715). Extract as `resizeBlock(blocks, id, edge, origStart, origMins, deltaSlots)`.
- Tag add/remove, at least one tag (558–577). Drop a tray category on a block adds a tag.
- Inline editor: title, description, category chips, done button (done look changed in S1.1, see "Sprint 1 changes"); closes on outside pointerdown, Enter, Escape (501–513, 1172–1221).
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
{ "app": "cadence", "schemaVersion": 2, "exportedAt": "<ISO>", "data": { "cats": [], "weeks": [[],[]], "templates": [], "history": [], "streaks": {} } }
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
- `data` = `{ schemaVersion: 2, cats, weeks, templates, history, streaks }` (same as the export envelope's data plus schemaVersion). Anything pulled goes through `normalizeData`.

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

## Post-launch changes (user requests, 2026-11-03)

### Hide the category tray
- The "Drag into the grid" label row gets a right-aligned text button "hide" / "show" in the same `S.panelLabel` look (Spline Sans Mono 11px uppercase, letter-spacing 0.1em, colour #9a8d7d, no border/background, underline on hover). Touch target at least 32px tall (44px on `(pointer: coarse)` via padding), without changing the row's visual height on desktop.
- Hidden: the tray grid is not rendered; the label stays so it can be shown again. Hiding disarms tap-to-place.
- Per device, not synced: localStorage `cadence:ui:trayHidden` = "1" when hidden (read/write in try/catch; default shown).
- While armed, the label text still switches to the tap hint; the toggle stays.

### Solid backgrounds on hollow blocks
- Blocks that are not done (dashed "empty" and solid-border "named", single- and multi-category) get `background: #fbf6ec` (the grid's own background) instead of transparent, so slot lines don't show through the text. Done (filled) blocks are unchanged. The multi-category gradient ring overlay is unchanged.

### Tasks tab
- Nav order: calendar, stats, tasks, categories, settings. View id "tasks".
- Data: `tasks: Task[]` added to `CadenceData`, `type Task = { id: string; name: string; done: boolean; createdAt: number }`. New localStorage key `cadence:tasks` (default `[]`). `normalizeData` drops tasks without a string id and non-empty string name, coerces `done` to boolean and `createdAt` to a number (default 0); a missing `tasks` key is not a drop. Export envelope and sync document include `tasks`; import of older files without tasks → `[]`. `isEmptyData` must treat a non-empty task list as content. The import summary line appends " · N tasks" (singular "1 task") only when N > 0.
- Actions (pure, tested): `addTask(data, name, deps?)` (trimmed; blank → no-op; appended at the end), `toggleTask(data, id)`, `removeTask(data, id)`.
- UI (`TasksView`, body width `S.catBody`): h2 "Tasks" (`S.statsTitle`); intro (`S.catIntro`) "The little things that don't need a slot on the grid."; add row (flex, gap 10, marginTop 16): text input (`S.tplNameInput` look, flex 1, placeholder "Add a task…", 16px on coarse pointers via the existing rule) + "＋ Add" (`S.catAdd` look, marginTop 0). Enter or the button adds and clears the input; focus stays in the input.
- List (marginTop 16, column, gap 8): each row like `S.catRow` (background #fbf6ec, radius 4, padding 10px 14px, align center, gap 12): a 22px round check button (1.5px solid ink border; done = background #1FA98A, border #1FA98A, white "✓"; aria-label "Mark done"/"Mark not done"), the name (Fraunces 16px, flex 1; tapping it also toggles; done = line-through, colour #9a8d7d), and a "✕" dismiss button (`S.catDel` look, aria-label "Dismiss") that removes it. On coarse pointers the check and ✕ get 44px hit areas.
- Empty list: `S.tplEmpty` "Nothing on your list."
- Insertion order; done tasks stay where they are.

## Sprint 1 changes (brief: `docs/BRIEF-sprints-0-1.md`)

### S1.1 A tick on every block
- Every block shows a round tick at the right of its top row: 1.5px ink ring, empty when not done; done = filled ink with a white "✓". 16px with the mouse, 24px on `(pointer: coarse)` (`.cadence-tick`), with the 44px touch hit area (`.cadence-hit44`). `aria-pressed`, aria-label "Mark done" / "Mark not done".
- One click or tap toggles `done` (the existing field and `toggleDone` action, history unchanged). Pointer-down on the tick stops there, so it never picks the block up, starts a touch resize or opens the editor.
- Done blocks take their area's tint instead of the legacy solid fill: area colour at ~18% (`#…2e`) over `#fbf6ec`, solid 1.5px border, ink text; multi-area done blocks blend the tints and keep the solid gradient ring. Not done stays as before (dashed / solid hollow). Nothing is ever red.
- The block under way now (Week 1, today, start ≤ now < end) gets a 2px ink ring (`nowRing`, a box-shadow) and "NOW · 38 min left" (`fmtLeft`: "38 min left", "1 h left", "1 h 05 left"): on its own line above the top row when the block is an hour or longer, otherwise in place of the duration.
- A 2px ink line crosses today's column at the current time, drawn above the blocks (JP, 2026-11-04; it was under them at first), with the time ("1:55pm", grid format) in an ink tag in the time column. Week 1 only, 7am–11pm only. The clock updates on each whole minute and when the page becomes visible (`useNow`).
- No Now/Next card, no Skip or Move buttons; unticked blocks just stay unticked. Logic: `src/lib/now.ts` (tested).

### S1.2 Guardrail quotas
- Data: `Category.limit: Limit`, one of `{ kind: "floor", min }`, `{ kind: "ceiling", max }`, `{ kind: "range", min, max }` (minutes per week). `targetMins` stays in `cadence:cats` and always equals `legacyTarget(limit)` (floor min, range min, 0 for a ceiling), so a copy of the app that isn't updated yet still reads a sensible target. `normalizeData`: a missing or unreadable `limit` becomes a floor at the old `targetMins` (no drop); a backwards range is turned round. New areas start as a 1 h floor.
- Migration safety: on the first load of data without guardrails, `loadData` keeps an untouched copy of the saved keys as an export envelope in `cadence:backup:before-guardrails` (never synced, never overwritten). Settings → Your data offers "Download it" while the copy exists. Checked against a real backup: zero drops, same counts, save/reload and export/import stable.
- Balance (`src/lib/guardrail.ts`, `weekBalance` in stats.ts): planned minutes this week (a multi-area block counts fully to each). Floor: partial credit toward it ("7 of 10 h"); ceiling: "38 of 40 h max", a past ceiling is "over", never short; range: full credit anywhere inside ("6 h, in range"), "3 of 4–8 h" below, "9 h, past 8 h" above. Each week stands alone: nothing carries over, roll forward copies the plan only.
- Sidebar "This week's balance" (`BalanceList`): dot, name, kind ("FLOOR 10 H"), the partial-credit label, and a bar spanning 1.2× the top limit (or the plan, if more): fill in the area colour, "still to plan" up to a floor/range in grey `#cabfb2`, the range band in `line`, ink marks at the floor, ceiling or both range ends. Notes under it describe, never judge: "Rest is lighter than your floor this week.", "Work is 2 h past your ceiling this week." No red, no green ✓.
- Categories view: per area a Floor | Ceiling | Range toggle with its one-line hint, then "At least", "At most" or "From"/"To" hours; switching kind keeps sensible numbers (`changeKind`).
- Buffer blocks (JP approved the design 2026-11-04): unassigned time that counts toward no area. The tray ends with a grey dashed "Buffer · 30m" item (`BUFFER_ID`, `BUFFER_MINS`, `BUFFER_COLOR`); drag or tap-to-place it like an area. Stored as `{ catIds: [], buffer: true }` (normal blocks get no `buffer` field). It shows "BUFFER" in the mono label style, dashed grey, no tick; it never counts in the balance or the sessions-done %. Dropped over a block it goes to the nearest free slot (never a tag); an area dropped or tap-placed on a buffer fills it (the buffer becomes that area's block). Moves, resizes, deletes, templates and removeCat keep it. An older copy of the app drops buffers it reads. Starter templates (S1.8) include one per day.
- Streaks still use `targetMins` until S1.3 replaces them.

### S1.3 Balanced weeks instead of daily streaks
- JP's choices (2026-11-04): a week is judged on ticked time only, and the number is all balanced weeks this season (it never goes down); a grace week only changes how its square looks.
- Source: `history` (one entry per area per ticked block, with the tick time), grouped into calendar weeks Monday–Sunday, local time. No new stored data, nothing new synced, no dependence on Roll forward. Unticking removes the entry, so the week is judged again.
- A week is balanced when every area keeps its guardrail: floor (or range low end) at least `floorPct` met, ceiling (or range top) passed by at most `ceilingOverPct`. Defaults 80 and 10; changed in Settings → Balanced weeks, saved per device in `cadence:ui:balanceRules` (not synced), with "Back to 80% and 10%".
- Season = weather season (winter Dec–Feb, spring Mar–May, summer Jun–Aug, fall Sep–Nov); a week belongs to the season its Monday is in. Weeks before the first tick ever are left out.
- Marks: balanced (filled square), grace (dashed: an unbalanced finished week with no other grace week among the three before it), not balanced (faint outline), this week (outline, still open; becomes filled as soon as it's balanced). Count = balanced squares, including this week once balanced.
- Card (`BalancedWeeksCard`): ink card, big number, "balanced weeks this season", the squares (each with an aria-label/title "Week of Nov 16: balanced"), "Dashed square: a grace week" when one shows. Sidebar: replaces the sessions-done card, with "2 of 6 blocks ticked this week" as its footnote. Stats: replaces the per-category streak cards. No flames, no broken-streak message, no red.
- `streaks` keeps its legacy shape and is still updated by Roll forward, but is no longer shown.

### S1.4 One panel for areas and tasks
- Replaces the sidebar, the phone stacking CSS and the Tasks view (nav is now calendar, stats, categories, settings). Task data and actions are unchanged; tasks get areas in S1.5.
- Calendar view: a main column with, in order, the week bar (`WeekBar`: Week 1 / Week 2 switch and a compact balanced-weeks card with the "N of M blocks ticked this week" footnote), the grid, and the week footer (`WeekFooter`: templates, "＋ Save current week", roll forward).
- Desktop (≥ 900px): the left panel (`AreasPanel`, 300px) lists each area as its drag handle (`AreaChip`: drag into the grid, or tap then tap a slot) with this week's balance under it (`BalanceBar`: kind, "7 of 10 h", the guardrail bar), then the buffer chip, the calm notes, and a Tasks section (`TaskList`: add, tick, dismiss; insertion order). Its head row reads "Areas · Drag into the grid" (the tap hint while armed) and has a "hide" button. Hidden: the grid takes the full width and the week bar shows "◂ Show areas and tasks".
- Phone (< 900px): areas and tasks share a tray docked at the bottom (`PhoneDock`, fixed, paper with an ink top rule, safe-area padding) with Areas and Tasks tabs ("Tasks · 3" when 3 are open) and a "▾ hide" button. Areas tab: chips in two columns, each with its bar and count; the tap hint only while armed; the notes below, reached by scrolling the tray (body capped at 30vh). One tap on "hide" folds it to a slim "▴ Show areas and tasks" bar. A spacer as tall as the dock keeps the end of the page reachable. This supersedes the Phase 3 "tray above the calendar, no bottom sheet" layout, per the sprint 1 brief.
- The dock covers the grid where it sits: while dragging, a pointer over the dock is no hit and no drop, and autoscroll uses the dock's top as the bottom edge (no autoscroll while over the dock). The engine reads it through `EngineEnv.viewBottom` (`dockTop` in `interaction/dom.ts`, the element with `data-cadence-dock`).
- Hidden/folded is one per-device choice, not synced: `cadence:ui:trayHidden` = "1" (the old tray "hide" key, so an earlier choice carries over). Hiding disarms tap-to-place.

### S1.5 Tasks under areas (schema 2)
- JP's choices (2026-11-04): no estimates on tasks (so no "of tasks · planned" line); tasks saved before S1.5 have no area; they go to an "Unsorted" group at the bottom of the panel ("Unsorted · give each an area", each row with "Move to…"), never into an area the user didn't pick. New tasks are always added under an area.
- Data, `schemaVersion: 2` (exports carry 2; importing anything above 2 says it's from a newer version). `Task = { id, name, catId: string | null, blockId?, attachedAt?, done, doneAt?, returnedFrom?, order, createdAt }`, still under `cadence:tasks`. `name` is the brief's "title", kept as `name` so a copy of the app from before S1.5 still reads the list (it drops the new fields, so update every device). `order` mirrors the array position; normalize sorts by it. `returnedFrom` is a day index (0 = Mon) for "back from Tue". Blocks get `sourceTaskId?` when made from a task.
- Migration (`normalizeData`): schema 1 tasks get `catId: null` and `order` = their position; a `catId` of a deleted area → null; a `blockId` whose block is gone is dropped (the task is back in its list); a block's `sourceTaskId` whose task is gone is dropped; duplicate task ids are dropped (counted); an `estMins` field is ignored. Before stored schema 1 tasks are migrated, an untouched copy is kept in `cadence:backup:before-tasks` (once, never synced), downloadable in Settings ("A copy of your data from before tasks moved under areas is kept on this device. Download it").
- Rules (`src/lib/tasks.ts`, pure, tested):
  - Drop a task on a block: it joins that block's to-do list (`blockId`, `attachedAt`), from the list or from another block. Shown as small checkboxes inside the block, after its label (the description and time make way).
  - Drop it on empty time: a block of its area, labelled with its name, as long as the area's block length, placed like an area drop (nearest gap, shrunk to fit). Unsorted tasks can't (no area); the drop preview shows nothing.
  - One task, one tick: a block made from a task and holding only it shows no checklist; ticking the block finishes the task, unticking reopens it.
  - Unfinished tasks come back: ticking a block sends its unticked tasks back to their list with `returnedFrom`; a Week 1 block that ends without a tick does the same, as the clock passes its end (checked each minute) — but only for tasks that joined before it ended, so a task put into a block that's already over (logging after the fact) stays until the block is ticked or rolled away. Deleting a block, applying a template over the week, roll forward and deleting an area free their blocks' tasks the same way (finished ones just unlink). Nothing reorders.
  - Finished tasks leave the list; "Show N done this week" (finished since this Monday) lists them, and they can be unticked there.
  - Templates and roll forward copy blocks, never tasks (template blocks never carry `sourceTaskId`). Deleting an area moves its tasks to Unsorted.
- Panel: under each area's balance, "▾ Tasks · 3" folds its tasks away (folds per device, `cadence:ui:foldedAreas`). Rows: tick, name, a mono note (where it sits — "Wed 9am", "next week · Thu 2pm" — or "back from Tue"), ✕; scheduled rows are faded; rows are drag sources like the area chips (mouse drag, touch long-press). "＋ Add a task" opens a name input; Enter adds and keeps the row open, Escape or an empty Enter closes it. Phone Tasks tab: the same, grouped by area with a colour dot, Unsorted last.

### S1.5b One task list, apart from the areas (JP, 2026-11-04)
- Supersedes the area parts of S1.5 ("I like keeping categories a bit cleaner"). Tasks are one plain list in the panel under the areas ("Tasks · drag onto a block"), and the phone Tasks tab is the same list. Areas are just their chip and balance again; no per-area task folds, no Unsorted group, no "Move to…".
- A task goes into blocks only: dropped on a block it joins that block's checklist; dropped on empty time nothing happens (no preview). While it sits in a block, its row shows one small dot per area of that block, in their colours (the buffer's grey for a buffer), before "Thu 9am".
- Data: no schema change. `catId` stays in the saved shape and is kept as it is (tasks given an area on Nov 4 keep it), but nothing reads it; new tasks get null. Blocks made from a task earlier (`sourceTaskId`) keep their one tick. Everything else in S1.5 (checklists, one tick, coming back "back from Tue", done this week, templates and roll forward) is unchanged.
- Adding (JP, 2026-11-07: "too small and at the bottom of the screen"): "＋ Add a task" is first in the list, a full-width 44 px dashed button, on the desktop panel and the phone Tasks tab. It opens a 44 px field with an "Add task" button in its place; Enter or the button adds and keeps the field open for the next one; an empty Enter, Escape, or leaving the field empty closes it. A new task goes on top, right under the field (`addTask`; the others keep their order, `order` renumbered). On a phone the tray rises above the on-screen keyboard while typing (`useKeyboard`, the same as the block sheet); not yet checked on a real iPhone.

### S1.6 Click or tap empty time to add
- JP (2026-11-04): an armed area's tap keeps placing it, exactly as before; the add window opens only when nothing is armed. It offers areas and the buffer, not tasks (tasks go into blocks only, S1.5b).
- A click or tap on empty time (not on a block, not the tap that closes an open block editor, not on a full day) opens it for that slot, which gets an ink outline (`S.slotMark`, one row). Desktop: a 240px window (`S.slotMenu`, paper, ink border) beside the point, to its right or flipped left, kept inside the viewport (`menuPosition`); scrolling the page closes it. Phone: a bottom sheet (`S.slotSheet`) over a light backdrop, above the dock.
- Contents (`SlotMenu`): "Add at Wed 9am", ✕; a length row "Usual · 30 min · 1 h · 1 h 30 · 2 h" (Usual = the area's block length, or 30 min for the buffer; default); then one row per area and the buffer, in the tray's dashed look, each showing what it would place ("9am–11am", the same nearest-gap / shrink-to-fit rule as a drop, `pickPlacement`) or "no room" (disabled). A pick places the block (`placeBlock` with the length) and closes. Escape, ✕, a tap outside, changing view, week or phone day close it with nothing changed. Dragging is unchanged.

### S1.7 Welcome back
- Shown at the top of the calendar view when the last edit is 7 days old or more (`shouldWelcome`, `src/lib/welcome.ts`), there is at least one template, and this absence wasn't answered yet on this device. New users (never edited) never see it.
- "Last edit" = `meta.updatedAt` as loaded when the app opened, raised by a copy pulled from the account (an edit on another device counts), never by automatic changes after opening (tasks coming back from ended blocks).
- Card (`WelcomeBack`, `S.welcomeCard`: paper2, ink border): "**Welcome back.** Start this week fresh from a template?", then, when Week 1 has blocks, "It replaces the 4 blocks in Week 1." (mono, grey). Buttons: one per template (`Use “Calm week”` when there's one, the names when several), and "Not now".
- A template button applies it to Week 1 (the usual Apply: replaces Week 1, its tasks go back to their list) and shows Week 1. "Not now" changes nothing, not even the edit time. Either answer is remembered per device (`cadence:ui:welcomeAnswered` = the last-edit time it was shown for), so it asks again only after the next 7-day gap.
- Since S1.8 it always has something to offer: the starter weeks.

### S1.8 Starter templates
- Three built-in starter weeks (`src/lib/starters.ts`), never stored or synced (not in `templates`, no change to the saved shape): "Work-heavy week", "Family week", "Recovery week". Each uses Work (a ceiling), Rest and People (floors) and Exercise (a floor), and has one 30-min buffer every day. Under-filled on purpose: every floor is 60–95% planned and Work sits under its ceiling, so there's room to add. Tested: on the grid, on half-hours, no overlaps, a buffer a day.
- JP's choice (2026-11-04): applying one adds the areas it needs that the person doesn't have (matched by name, case and spaces ignored), with the starter's guardrail and block length and a calm colour (Rest #9B4DCA, People #0CA678, else the first free palette colour, never #D6336C); areas the person already has keep their own limits and get the starter's blocks. It replaces the week like a template (tasks in replaced blocks go back to the list).
- Templates section below the grid: "Starter weeks" beside the person's own templates, each row with the name, a one-line description, "Adds Rest and People to your areas." when it would, and "apply" (to the week shown). The person's list now reads "No templates of your own yet." when empty.
- Welcome back (S1.7) offers them too ("or a starter:" after the person's templates, "Starter weeks:" when there are none), so it can always show.

### S1.9 French and English
- Every string the app shows lives in `src/i18n/en.ts` and `src/i18n/fr.ts` (Canadian French: « courriel », « fin de semaine », 24-hour times, decimal comma), same shape, checked by the types and a test (same keys, no empty strings, French never just the English). Wording made by `src/lib` lives in `src/lib/words.ts` (English) and `src/lib/words.fr.ts`; each lib function takes the words as an argument, English by default, so the logic stays pure and the tests read English. Components read `useI18n()` (`src/i18n/I18nProvider.tsx`): `m` (the catalogue), `lang`, `locale` ("fr-CA" / "en-CA").
- Language: the device's (`navigator.languages`: the first French or English one; anything else → English), unless chosen in Settings → Language ("Device language", "Français", "English"), saved per device in `cadence:ui:lang` (never synced). `<html lang>` and the tab title follow it.
- Formats: times "9 h", "13 h 30" in French, "9am" in English; lengths "2 h 30" / "2h30"; hours with a decimal comma in French ("2,5 h"); dates through `toLocaleDateString(locale)`; short day names "lun." … "dim.".
- Data stays as the person wrote it: area, task and template names aren't translated. A new person's default areas are named in their language (Exercice, Travail, Apprentissage, Loisirs; same ids), and untouched defaults in either language still count as "nothing worth keeping" for the first sign-in. Starter weeks match areas by their English or French name and add missing ones in the person's language. Import errors from the lib are shown translated.
- JP reviews the French.

### S1.10 Neutral stats
- Stats gets "Last week": one sentence per area about last calendar week's ticked time against its guardrail, describing, never judging (`describeLastWeek`, `src/lib/describe.ts`): "Rest was lighter than your floor (5 of 8 h).", "Work stayed under your ceiling (32 of 40 h).", "No Rest blocks were ticked." A test checks no sentence uses "miss", "fail", "only", "behind", "should", "broke" or "bad". The other calm wording (balance notes, balanced weeks, grace squares) already described.

### S1.11 Early-bird badge
- When signed in, the app reads `early_bird` for the account's email (lower-cased) from `entitlements` (read-own RLS, set by the pre-sale webhook). If true: a small "Early bird" pill by the logo (`S.earlyBadge`) and a thank-you in Settings ("Thank you for believing in Cadence early…"). No feature gating. The answer is remembered per device for that email (`cadence:ui:earlyBird`), so it shows offline and doesn't flicker; a fresh answer from the server wins; an error (offline, no table yet) keeps what was known.

### Audit fixes (2026-11-06)
- Automatic changes are not edits: tasks coming back from ended blocks go through `store.adjust`, which saves the change but keeps `meta.updatedAt`. Before this, a device opening with an old copy stamped itself newer than the account and overwrote newer work. Every device works out the same result, and the next real edit syncs it. `isRemoteApply` also needs a new edit time, so an automatic change never closes an open editor.
- Reduced motion: under `prefers-reduced-motion: reduce`, all transitions and animations are off (`FONT_IMPORT`) and pressed items don't scale; state changes appear at once.

### Add window and block popup (JP, 2026-11-06)
- Supersedes the length row in S1.6. The add window asks for an area only: a grid of area buttons plus the buffer (dot and name, wrapping to two columns on a phone); one tap places the area's usual length (the buffer's 30 min) by the drop rule and closes; the person resizes it in the calendar. An area with no room is disabled. Desktop: 252px window with a small pop-in. Phone: a floating sheet with margins and rounded corners, not edge to edge. Both entrances are off under reduced motion.
- The block popup (`BlockEditor`) gets a Tasks section: tasks in this block first (✓; tap to take one out, it goes back to the list without a "back from" note), then free open tasks (＋; tap to add), then tasks already in another block (↪, dashed row, that block's colour dots and time; tap to move it here). The list scrolls past about five rows. "No open tasks." when there are none. So a task can now reach a block without dragging.

### Undo after a week is replaced (2026-11-06)
- Applying a template or starter week, and roll forward, stay one tap and offer "Undo" in a bar at the bottom (`UndoBar`, `src/lib/undo.ts`). Undo restores the whole document as it was (the week, areas a starter added, tasks sent back). The offer has no timer: it stands while the data is exactly what the action left, and ends with any other change, a copy from the account, or ✕.

### Plain words and the block count (JP, 2026-11-07)
- Supersedes the bar and notes of S1.2 and S1.4 (`BalanceBar`, `BalanceNotes`) and the wording of S1.2 and S1.10. The data is unchanged: `floor`, `ceiling` and `range` stay as the kind names in `cadence:cats`.
- Words A: the kinds read "At least", "At most" and "Between" everywhere (FR « Au moins », « Au plus », « Entre »). Limits: "At least 10 h", "At most 40 h", "Between 4 and 8 h". The areas page ("Your areas", nav "areas"): an At least | At most | Between toggle with its hint ("For time you want to protect, like rest." / "For time that tends to take over, like work." / "Anywhere between the two counts."), then "Hours a week" or "From"/"To". Settings: "“At least” reached (%)" and "“At most” passed by (%)". Last week (S1.10): "Rest was under its 8 h (5 h).", "Rest reached at least 8 h (9 h).", "Work stayed within its 40 h (32 h).", "Work went 3 h over its 40 h (43 h).", "Project landed between 4 and 8 h (5 h)."; the French uses a colon so nothing has to agree with the area's gender (« Repos : sous les 8 h visées (5 h). »).
- Visual B (`BlockCount`, `src/lib/blockCount.ts`): under each area chip (desktop panel and phone tray), one row: a square per block of its goal (the goal ÷ the area's block length, rounded up), filled in the area colour as blocks are planned (part of a block fills part of a square), then a tag in time, not blocks (JP, 2026-11-08: "I don't mind tracking block as a UI thing… just remove the blocks as a target"), exact and in the chip's own format: "3h to go" / "reached" (at least); "8h left" / "at the limit" / "1h over" (at most); "2h to go" / "in range" / "1h over" (between); "1h30 to go", "30m over". The squares stay a picture in blocks (past the top, one striped square per started block). Never the "½" sign. More than 16 squares: a thin bar with the same words. FR: « encore 3 h », « encore 1 h 30 », « encore 30 min », « reste 6 h », « 1 h de trop », « à la limite », « atteint », « entre les deux ».
- Squares: "at least" has solid borders in the area colour; "at most" lighter ones (allowed, not needed); "between" solid up to its low end, dashed after (room, not need); past the limit, striped ink squares.
- Warnings in ink, never red, never colour alone: under (time still to go) an outlined dashed tag with "!"; over a solid ink tag with "!", plus the striped squares; reached and in range "✓" in ink; room left and at the limit plain grey. A screen reader hears "Rest, At least 10 h: 2h to go".

### Onboarding (JP, 2026-11-07)
- For new people only (`shouldOnboard`: never edited on this device, nothing saved worth keeping, not seen here before; `cadence:ui:onboarded` per device). JP's friend and anyone with a week never see it. Settings → About → "Show the introduction again" brings back the purpose page and the checklist, starting over at 0 of 5 (`restartChecklist`).
- Purpose page (`PurposePage`): a modal card (focus kept inside, Escape = Skip, the page behind doesn't scroll) with an FR / EN switch (saved like Settings → Language; renames untouched default areas, `relabelDefaults`, an automatic change, not an edit), "Balance the parts of your life.", one line on what it does, an example week (seven small columns of coloured blocks, then "Rest · at least 10 h ✓", "People · at least 4 h ✓", "Work · at most 40 h ✓"), "Nothing moves unless you move it. Your weeks stay on this device unless you sign in to sync them.", "Already use it on another device? Sign in instead" when sync is set up (opens Settings), "Skip" and "Show me how". No medical-device line (JP: "It's clearly not a medical device"; the site's footer keeps it).
- Path 1, try it first: "Show me how" opens the calendar and points at the first area (`Coach`: a ring around the element with that `data-coach` value and a small bubble beside it; the page stays usable, nothing is blocked). Desktop: "Drag Exercise onto the week" / "Any time works. You can move it after."; phone: "Tap Exercise, then tap a time" / "Or hold it and drag it." (the tray opens on Areas). Once a block of that area lands, the bubble moves to its count: "Exercise has its first block" / "Its squares fill as you plan. The tag says how many blocks it still needs this week." → "Next" → the block's tick: "Tick the circle when it's done" / "Ticked blocks count toward balanced weeks." Ticking it, "Got it", "Not now" or Escape ends the guide.
- The checklist (path 4) takes over once the first block lands (`Checklist`, top of the calendar view; never behind the purpose page or during the first drag): "Getting started · 2 of 5": Place a block, Tick a block when it's done, Make an area your own, Put a task in a block, Try a starter week. Items tick themselves from what the person does from the moment the checklist starts, whatever their weeks already hold (JP, 2026-11-07: a replay showed 5 of 5 at once). Each change to the data is judged on its own (`progress(prev, next)`, `src/lib/guide.ts`): a block of an area that wasn't one before (placed, or a buffer filled); an open block ticked (not one Undo brings back ticked); an area renamed or changed, or added or deleted on its own (not the areas a starter week or its Undo brings or takes, never a language switch of the untouched defaults); a task put into a block that was already there; a template saved. Trying a starter week or applying a template the app reports itself. What's earned stays ticked. Each open item has "Show me": the same kind of hint on the area to drag, a block's tick, the areas page's "＋ Add an area", "＋ Add a task" (phone: the tray opens on Tasks) or the starter weeks. "hide" folds it to its title, ✕ closes it for good on this device, and with all five done it says "You're all set." with Close.
- "Skip": no guide; the checklist waits at the top of the calendar.
- A hint scrolls its target into view only when it's hidden (off screen, or under the phone tray), with no smooth scrolling; the bubble sits under its target, or above when there's no room.
- No data change: what's new is per-device UI state (`cadence:ui:checklist`: shown, closed, folded, done; never synced).

### Feedback when a step is done (JP, 2026-11-07)
- JP's ask: a step done in another tab only showed as crossed off on coming back. JP's ideas were to scroll up to the checklist and animate the cross-off, or a pop-in screen on the phone. Chosen design (JP: "Build both"): the page never scrolls to the checklist (nothing moves unless you move it), and a pop-in for every step would interrupt by the third, so:
- Away from the checklist (another page, scrolled away, the list folded): a toast drops in at the top (`QuestToast`), clear of the phone tray, the keyboard and the Undo bar. The check draws itself in green (`doneGreen`, the roll-forward green), the step is struck through, its square pops among five ("Getting started · 3 of 5"), and "Next: <first open step> · Show me" leads on. Several steps at once (a starter week: placed and tried) share one toast, in checklist order. It never takes focus, stays while hovered, focused or touched, closes after 5 s or with ✕.
- With the checklist on screen (at least half of it, unfolded): no toast; the step crosses off there (the mark pops green, a line strikes the words, then the usual done look). A step done elsewhere crosses off there the next time the list is seen. During the guided first block the coach explains the step instead of a toast.
- Five of five: the finale card (`QuestFinale`): "You're all set.", "That's the basics. The rest of the week is yours to plan.", the five steps landing one by one, small squares in the person's area colours rising from the card, and "Start planning", which closes it and the checklist for good (Escape or a tap outside too).
- On a phone both are a size up (JP: "a bit bigger on mobile"): the toast nearly edge to edge with an 18 px step, 14 px squares and 44 px "Show me" and close; the finale with a 32 px title, 17 px steps, 26 px checks and a full-width "Start planning".
- Rules in `src/lib/guide.ts` (`earned`, `nextItem`, `feedbackFor`), tested. Under reduced motion nothing moves and the end state shows; the squares stay hidden.

### Phone block sheet (JP, 2026-11-07)
- On a phone, tapping a block opens it in a floating sheet like the add window (`BlockSheet`) instead of the editor squeezed into the block; the block gets a double ink ring underneath. Nothing is focused, so no keyboard until a field is tapped (the desktop popup still puts the cursor in the title with a mouse; on touch it no longer does).
- Header: the block's colour(s) and "Sat · 2pm–4pm" (`blockWhen`, `src/lib/sheet.ts`), then Delete (trash icon, 44 px, labelled "Delete this block") and Done (44 px), 12 px apart. Body: title (18 px), description (16 px), Areas (44 px chips: a solid tinted chip with ✓ when on, dashed when off), Day (seven 44 px buttons in one row; the day view follows the block), Tasks (44 px rows; the sheet scrolls, not the list). Enter in the title only closes the keyboard.
- While typing, the sheet sits above the on-screen keyboard (`keyboardInset` from the visual viewport) and fits the height left, so Done stays in reach. Not yet checked on a real iPhone.
- Deleting a block (the sheet, desktop right-click, the touch popup) can be undone: "Block deleted. Undo" in the Undo bar.

### Consumer basics (JP, 2026-11-07)
- Crash screen: an error boundary around the app (`ErrorBoundary`, `CrashScreen`) shows "Something went wrong. Your weeks are still saved on this device." instead of a blank page, with Reload, "Download my data" and a "What happened" fold (the error message). It stands on its own (language read from the device, no app state). "Download my data" saves the stored keys exactly as they are (`crashBackup`, `src/lib/crash.ts`), which Settings → Your data imports.
- Help and feedback: Settings → About adds "Help and feedback" with "Write to us" (a mail to `VITE_SUPPORT_EMAIL`, subject "Cadence: help and feedback") and "Questions and answers" (the site's FAQ, `VITE_SITE_URL` + `/fr/#faq` or `/en/#faq`), each shown only once set (`helpLinks`, `src/lib/legal.ts`). The crash screen offers "Write to us" too.
- Delete my account (Quebec Law 25): Settings → Account & sync, signed in: a quiet "Delete my account" asks first, in place: "This deletes your sign-in and the copy of your weeks on our server, for good. Your weeks stay on this device… Purchase records are kept as the law requires." "Delete my account" or "Keep my account". It calls `delete_my_account()` (`supabase/schema.sql`: security definer, acts on `auth.uid()` only; deletes the synced row and the auth user, whose sessions go with it). Then the device is signed out and keeps its weeks, local only: "Your account is deleted. Your weeks are still on this device." Offline or refused: nothing changes, an error says so. Purchase and early-bird rows aren't touched. JP re-runs `schema.sql` in Supabase to add the function.
- Sounds: small sounds made on the spot with Web Audio (`src/lib/sounds.ts` the tones, `src/state/sound.ts` the player): a soft tap when a block is placed, two notes up for a tick, one note down for an untick, a low thump for a delete, a three-note sparkle for a getting-started step (just after the tick that earned it), a rising chord for five of five. Quiet (peak gain at most 0.12) and short (under a second). "Ambient" audio session where the browser has one, so music keeps playing and the silent switch is followed. Settings → Sounds is one Volume slider (JP, 2026-11-08), 0–100% in steps of 5, "Off" at 0, per device (`cadence:ui:soundVolume`; 50% when never set plays the tones as designed, 100% twice as loud; a sample plays on release). The earlier on/off setting (`cadence:ui:sound` = "off") reads as 0 and is removed once the slider is moved. Sounds play only for what the person does here, never for a copy from the account.
- Your day: Settings → Your day chooses the hours the calendar shows, "Starts at" midnight to 20:00 and "Ends at" four hours later or more, up to midnight; 7:00 to 23:00 by default; per device (`cadence:ui:dayHours`). Blocks outside the hours still show: the calendar grows by the hour to hold every block of both weeks (`gridBounds`, `src/lib/dayHours.ts`), so nothing is hidden or moved. Placing, moving, resizing, the add window, the drop preview and the now line follow the hours shown; the grid tells the drag maths its hours (`data-day-start` / `data-day-end`). Stored blocks may now sit anywhere midnight to midnight (`normalizeData` used to drop blocks outside 7:00–23:00). An older copy of the app still drops them: open the app once on every device before planning outside 7:00–23:00.

### Rolling the week forward: its review (JP, 2026-11-08)
- Roll forward plays a soft turn-of-the-page sound and, when Week 1 had blocks, opens a card on how it went (`weekReview`, `src/lib/review.ts`; `WeekReview`): judged on ticked blocks with the balanced-week rules (Settings → Balanced weeks), a block for several areas counting fully to each. "A balanced week." when every area kept its time, with a fanfare and squares rising in the area colours; otherwise "That week is done.", no fanfare. Then "3/4 ticked" and one short row per area (JP: the sentences were verbose): colour dot, name, hours ticked, its target ("At least 4 h"), and a green ✓ when it kept its time; the neutral S1.10 sentence is the row's label for screen readers. "Start the new week", Escape or a tap outside closes it; the Undo bar stays underneath. An empty week rolls without a card.

### Stats, shorter (JP, 2026-11-08: "less verbose")
- Stats reads top to bottom: the balanced-weeks card; "Last week", one short row per area like the week review (name, hours ticked, target, ✓ when kept; `lastWeekLines`, the S1.10 sentence kept as each row's screen-reader label; shared `AreaRows`); "Time invested" with its month / quarter / year switch beside it, bars with hours only ("14 h"; sessions in the row's tooltip); "Counts the blocks you tick."; Reset stats.
- Rows and bars sit close to their names (JP: "numbers are really far away"): the rows are columns sized to their content, bars stop at 82% with the hours just after them.

### Area icons (JP, 2026-11-08)
- An area may carry one icon from a set of 24 line icons (lucide, ISC licence, bundled so it works offline; `src/lib/icons.ts` the names, `AreaIconView` the drawings). Areas page: the square button before the name opens the grid, "None" takes it away. Drawn in the area's colour before its name on its chip, its blocks (one area only), the add window, the phone sheet, the week review and Stats; without one, the colour dot as before. Stored as `icon` on the area in `cadence:cats`; `normalizeData` keeps only a known name, so older data loads unchanged. An older copy of the app drops the icon when it saves: update every device.

### Settings in four groups, as short rows (JP, 2026-11-08: "more readable")
- Four groups, each a title and one card of rows (`SetRow`): the setting's name on the left, at most one short grey hint under it, its control on the right (under it on a phone). No paragraphs; "Saved on this device." once, under Look and sound.
- Your week: Day starts, Day ends (selects); Balanced week, summed up ("Targets met to 80%, limits passed by 10% at most") with Edit opening the two numbers.
- Look and sound: Look (Paper / Night / Contrast / Auto), Sounds (volume slider), Language (Auto / Français / English).
- Data and account: early-bird thanks above the card; Sync ("The same weeks on your phone and computer", Sign in opens the email form under the row; signed in: the email, the sync status, Sign out); Export my data; Import from file; Delete my account last, small and grey, asked in place.
- Help: Questions and answers, Write to us (once the site or support address is set), Show the introduction, Privacy and Terms; one line under the card on what the app keeps where.

### The phone's week, day templates, previews (JP, 2026-11-08)
- Areas tab (JP, 2026-11-08, "could use a bit of UX love"): one line under the title, then a list, one row per area: its icon (or initial) on its colour, its name, its goal, number first, the sign and number bold in ink and the key word plain ("**≥ 4 h** at least", "**≤ 40 h** at most", "**↔ 2–5 h** between"; FR « au moins », « au plus », « entre les deux »; JP chose the signs over edges or zones), the same signs above At least / At most / Between in the editor; the block length only inside, as "Default block size". Tap a row to open it (one at a time): name, At least / At most / Between with its hint, − / ＋ steppers in half hours for the hours (two for Between) and the default block size (at least half an hour), the palette as circles plus one for any colour, the icon grid, and "Delete this area", which asks first because the area's blocks and history go with it. A new area opens ready to name. Blocks in several areas show each area's icon in its colour (a dot when it has none).
- Phone: "Day | Week" above the calendar, remembered on this device (`cadence:ui:phoneView`). Week is the real calendar with seven slim columns (`WeekGrid narrow`, 24px rows; JP: "the same functionality as the day calendar"): blocks show their area's icon (or initial) and, from an hour, their tick; tap empty time to add, tap a block for its sheet, hold to move, the grips to resize, tap-to-place from the tray. No swipe between days in Week.
- Day templates: in Templates below the calendar, "＋ Save this week" and "＋ Save a day" side by side, each with its own templates listed under it. Either opens a popup first: what will be saved in miniature with hours per area, a name ("Template 2" / "Day 1" when left empty), Week 1 or Week 2 to save from (the week shown unless it is empty; empty weeks can't be picked), for a day which day (the phone's day, else today; days without blocks can't be picked), "Your week stays as it is.", then Save or Cancel. Preview bars for a block in several areas use the calendar's colour blend (`lib/blend.ts`). Stored in `cadence:templates` as a template with `day: true` and its blocks on day 0 (`saveDayTemplate`; `normalizeData` keeps the flag). Using one replaces only that day's blocks (`applyDayTemplate`; their tasks go back to the list), with Undo ("Sunday replaced."). Day templates aren't offered by Welcome back. An older copy of the app reads one as a week template with Monday only: update every device first.
- Preview: "preview" on every template, starter week and day template (and Welcome back's buttons) opens a card first (`TemplatePreview`, `previewChange` in `src/lib/templatePreview.ts`, worked out from the real result): the name, "Into Week 1" (a day: "Into Sunday, Week 1" with a day picker), the result in miniature, hours per area, the areas a starter adds, "Replaces the 9 blocks in Week 1. You can undo." (or "Week 1 is empty."), then "Use it" / "Cancel". Escape or a tap outside cancels.

### Looks (JP, 2026-11-08)
- Settings → Look: Paper (the app as it has always been, the default), Night, High contrast, or Match device (Night when the device is dark). Per device (`cadence:ui:theme`), applied before the first paint as `<html data-theme>`. Every colour of the app's own look is a CSS variable by role (`--c-ink`, `--c-paper`, `--c-card`, `--c-muted`…; palettes in `src/lib/theme.ts`, tested for text contrast: 4.5:1, 7:1 for ink in high contrast); area colours never change. Text on an ink fill uses paper, so filled buttons invert with the theme.

### About in Settings, and audit items 3–5 (2026-11-07)
- About: what the app is, "Show the introduction again", and privacy / terms links in the person's language once `VITE_SITE_URL` is set (`src/lib/legal.ts`). No medical-device line (JP).
- The product name lives in `src/appName.ts` (screens, page title, install manifest); stored keys, the export's `app: "cadence"` and backup file names stay. The install description and page meta carry French first, then English; `<html lang>` starts as fr-CA. The sign-in email template in `docs/SUPABASE_SETUP.md` is bilingual, French first (pasted by hand in Supabase).

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
