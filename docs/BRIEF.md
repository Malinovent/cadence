# Brief: Cadence 2.0, an installable web app (PWA) that syncs across devices

## Goal
Turn **Cadence** (my weekly time-balancing app, currently `cadence.html` in this folder) into an installable web app (PWA) that one user, a friend of mine, can use on her **computer** and her **iPhone**, with her data **synced between the two**.

- It's only her data. No sharing, no multi-user features.
- No App Store for now. She installs it from Safari with "Add to Home Screen".
- Keep the app feeling the same: same features, same look, same voice.

**Please work in phases (listed below) and stop after each one so I can check it before you continue.**

---

## What exists today (read `cadence.html` first)
- One self-contained HTML file: React 18 (inlined UMD build), hand-written `React.createElement` code, inline style objects (`S.*`).
- Fonts: Fraunces + Spline Sans Mono (Google Fonts). Background `#f4ede1`. Tagline: "Balance the week before the week balances you."
- Data is saved in `localStorage` under five keys:
  - `cadence:cats`: categories `{id, name, color, targetMins, blockMins}`
  - `cadence:weeks`: `[week0[], week1[]]`, a list of blocks per week: `{id, catIds[], day, start, mins, label, desc, done}`
  - `cadence:templates`: saved week snapshots
  - `cadence:history`: completed sessions for stats `{catId, mins, date}`
  - `cadence:streaks`: `{catId: {count, lastWeek}}`
- There's already a `migrateBlocks` step that upgrades older saved data (single `catId` to a `catIds` array). Keep that working.

### Features that must survive
- Two-week grid (this week / next week), Mon–Sun, 7:00–23:00, 30-min slots
- Drag categories from the tray onto the grid; smart placement (`resolvePlacement`: snaps to neighbours, avoids overlap, shrinks the block to fit the gap)
- Move blocks; resize from top/bottom edges
- Drop a category onto an existing block to add a second tag; remove tags (at least one must stay)
- Inline rename / description; mark done (logs to history; un-marking removes the entry)
- Quota progress per category (multi-tagged blocks count fully toward each tag); weekly completion %
- Templates: save / apply / delete
- Advance week (week 2 becomes week 1) and update streaks
- Stats view with time range; categories editor; reset stats (with confirm)

---

## Target architecture
- **Project:** Vite + React (TypeScript is fine if you prefer). Port the existing logic faithfully. Pure functions like `resolvePlacement`, `freeGaps`, `fmtTime` and `fmtDur` should move into their own module with a few unit tests.
- **PWA:** `vite-plugin-pwa` (or equivalent), plus:
  - web manifest (`display: standalone`, name "Cadence", theme/background colours matching the app)
  - proper icons, including `apple-touch-icon` (180×180), so it looks right on the iPhone home screen. Replace the emoji favicon.
  - iOS meta tags (`apple-mobile-web-app-capable`, status bar style, `viewport-fit=cover`) and safe-area padding
  - service worker that caches the app shell so it opens offline
- **Sync backend:** Supabase (free tier)
  - Auth: email **magic link** (no passwords)
  - One table, e.g. `cadence_state (user_id uuid pk references auth.users, data jsonb, updated_at timestamptz)`, with **row-level security** so a user can only read and write their own row
  - `data` holds the same five pieces of state as today, plus a `schemaVersion`
- **Hosting:** GitHub Pages (I'm on GitHub as Malinovent). Vercel/Netlify is fine if it's meaningfully simpler; tell me why. It must be HTTPS.

### Sync behaviour (keep it simple)
- **Local-first:** the app always reads and writes a local copy (localStorage or IndexedDB) and works fully offline.
- On change: push to Supabase (debounced ~1–2 s).
- On launch, and whenever the app comes back to the foreground (`visibilitychange`): pull, and take the server copy if its `updated_at` is newer.
- Conflict rule: last write wins on the whole document. That's acceptable for one person on two devices.
- Show a small, unobtrusive sync status (synced / offline / syncing) and a sign-out option.
- Signed out = local-only mode still works. On first sign-in, if the server is empty, upload the local data. If both have data, ask which to keep.

---

## Mobile / iPhone requirements
The current app is desktop-only in two ways that break on a phone:
1. **Dragging uses the HTML5 drag API** (`draggable`, `onDragStart`), which doesn't work with touch on iOS.
2. **Resizing uses `mousemove` / `mouseup`**, which doesn't work with touch either.

Please:
- Rebuild drag, move and resize on **Pointer Events** (or a library like dnd-kit) so they work with mouse and touch alike. Use a short long-press to pick up a block on touch so scrolling still works.
- Add a **tap-to-place** fallback: tap a category in the tray, then tap a slot.
- Make touch targets at least 44 px (especially the resize handles) and stop iOS from zooming on double-tap or input focus.
- **Phone layout** (narrow screens): show **one day at a time** with easy day switching (swipe or a Mon–Sun strip), and make the tray a bottom bar or sheet. Quota progress collapses into a compact summary. Desktop keeps the full two-week grid.

---

## Moving her existing data
Her current schedule only exists in her browser's localStorage (for wherever she opens `cadence.html`).
- Add **Export (JSON download)** and **Import (JSON file)** to the new app's settings, with validation and `migrateBlocks`-style upgrading.
- Also make a small **patched copy of the old file** (`cadence-export.html`) that adds only an "Export my data" button. She opens it **in the same browser, from the same location** she uses now, so it can see her saved data, then imports the file into the new app. Tell me if there's a simpler route.

---

## Phases (stop after each for my OK)
1. **Port:** Vite project, same behaviour and look as today, still localStorage. Add export/import. Unit tests for the placement logic.
2. **PWA + deploy:** manifest, icons, service worker, iOS tags; deployed to an HTTPS URL I can open on my phone.
3. **Mobile:** touch drag/move/resize, tap-to-place, phone layout.
4. **Sync:** Supabase auth + table + RLS + local-first sync. Give me step-by-step instructions for the parts I have to click through myself (creating the Supabase project, auth settings, redirect URLs, env vars). Never commit secrets; the anon key goes in env config.
5. **Handoff:** the `cadence-export.html` migration file, a short README, and a one-page "how to install on iPhone" note I can send my friend (open in Safari → Share → Add to Home Screen → sign in with email link).

## Done means
- On iPhone: installed from Safari, opens full-screen with the Cadence icon, works offline, and drag/resize/tap all work by touch.
- A change on the computer shows up on the phone within a few seconds of opening it, and vice versa.
- Her old data imported without loss: categories, both weeks, templates, history and streaks.
- All the features listed above still work on desktop.

## Out of scope (for now)
App Store / Capacitor wrapping, push notifications, sharing between users, calendar integrations. Keep the code clean enough that a Capacitor wrap would be easy later.
