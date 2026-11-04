# Brief: sprints 0 and 1

Source: JP's Claude doc "Claude Code brief: Cadence sprints 0 and 1" (as of 2026-11-03), copied here 2026-11-04.
The new product name is `{{APP_NAME}}` until JP picks one (by 2026-11-08); then replace it everywhere.
Wireframes: `docs/wireframes/` (see its README). Follow them, and ask JP wherever they and this brief disagree.

## Context

JP, a solo developer in Montreal, is testing whether people will pay for a weekly balance planner before building a store app. These two sprints ship a pre-sale landing page by Nov 15, then improve the web app while the test runs until Dec 20.

**The product.** `{{APP_NAME}}` (currently the repo "Cadence") is a two-week planner that balances time across life areas, such as work, rest, people and projects, against weekly hours per area. It's for adults with ADHD whose work and hyperfocus eat the week while rest, people and chores get squeezed. The pitch: protect your rest from your work week.

**What exists.** React, TypeScript and Vite on Node 24, Vitest and ESLint, deployed to GitHub Pages by GitHub Actions. An installable offline web app with:

- a two-week grid, drag or tap to place blocks, and blocks that count toward several areas
- weekly quotas, templates, roll forward, streaks and a stats view
- JSON export and import
- a phone day view with touch drag, resize and swipe
- optional Supabase sync with email-code sign-in

One real user, JP's friend, uses it on her computer and iPhone. Her data must survive every change.

**Dates.**

| Date | What |
| --- | --- |
| Nov 15, 2026 | Sprint 0 done: the landing page can take a real $39 payment |
| Nov 16 | Pre-sale goes live |
| Dec 20 | Pre-sale ends, and JP decides Go, Iterate or No-go |
| Dec 20 | Sprint 1 done |

A Go leads to a later brief covering the native wrap, purchases, widgets and a mid-February store launch. Don't build any of that now.

## Rules that apply to everything

These come from Quebec, Canadian and app-store rules. Requirements, not preferences.

1. **French first.** Every screen, email, receipt and legal page exists in Canadian French and English, with French as the default for Quebec visitors and the Terms shown in French first. No hard-coded strings: all text goes through the translation files.
2. **No health data.** Never ask whether someone has ADHD or any condition, in any form, field or survey. Store nothing that implies a diagnosis.
3. **No tracking.** No ad pixels, no third-party trackers, no analytics cookies. Count visits without IP addresses or fingerprints.
4. **No health claims.** Copy may say who it's for ("designed for ADHD brains"), never what it fixes. Never "reduces symptoms", "treats" or "improves focus". Footer: a planning tool, not a medical device or treatment.
5. **Email consent (CASL).** Waitlist uses an unticked consent box with clear wording, the sender's name and contact details, and an unsubscribe link in every email. Record when and how each person consented.
6. **Privacy (Quebec Law 25).** Plain-language privacy policy naming JP as the person in charge of personal information, with a contact address. Keep data in Supabase's Canada region if the project can move there; otherwise flag it to JP. Private by default.
7. **Don't lose anyone's data.** Every schema or storage change migrates existing local and synced data. Offer a JSON export before any migration runs, and test the migration against real-shaped data.
8. **Nothing moves unless the user moves it.** The app never reschedules, auto-fills or reorders blocks on its own.
9. **Calm visuals.** Respect reduced motion, never rely on colour alone, never show a shortfall in red.

## Sprint 0, due Nov 15: the pre-sale page

Ship a bilingual landing page that takes a real $39 early-bird payment, collects a waitlist and counts results by headline and traffic source.

**Where it lives.** Propose the setup before building. Default: a separate static site repo (`{{APP_NAME}}-site`) on GitHub Pages with JP's new domain, while the app keeps its current URL. Supabase edge functions handle anything server-side.

**The page, top to bottom:**

1. **Hero.** Headline A or B, picked 50/50 on first visit and kept for that browser session in session storage, no cookie. Subline, a 30-second muted clip of the app (JP records it; placeholder for now), and two buttons: "Get the early bird, $39 once" and "Join the waitlist".
2. **How it works.** Three steps: set floors and ceilings for your life areas, drag your week into place, check your balance at a glance.
3. **The early-bird offer.** $39 once for Pro for life, the web app right away, phone apps promised "by spring 2027". State that the price ends Dec 20, 2026, and link the refund policy.
4. **FAQ.** What "lifetime" means, where data lives, French and English, and "Is this medical?" (no).
5. **Footer.** Terms, privacy, refunds, contact, the person in charge of personal information, and "A planning tool, not a medical device or treatment."

**Copy to start from** (JP approves the final wording):

| | English | Français |
| --- | --- | --- |
| Headline A | A weekly planner designed for ADHD brains | Un planificateur de semaine pensé pour les cerveaux TDAH |
| Headline B | A week that doesn't eat your rest | Une semaine qui ne gruge pas ton repos |
| Subline | Set a floor for rest and people, a ceiling for work, and plan your week in minutes. | Fixe un minimum pour le repos et tes proches, un maximum pour le travail, et planifie ta semaine en quelques minutes. |

**Checkout.** The merchant of record JP picks (Paddle or Lemon Squeezy), behind a thin adapter so it can be swapped. Provider's overlay checkout in the visitor's language. A webhook to a Supabase edge function verifies the signature and stores email, order ID, amount, currency, language, headline, traffic source and time in a `purchases` table, and sets `early_bird = true` for that email in an `entitlements` table, so the web app and future store apps can unlock Pro by account. A thank-you page explains how to sign in to the web app with the same email.

**Waitlist.** Email, language and an unticked consent box. Stored in a `waitlist` table with headline, traffic source, consent time and consent-wording version. If JP has picked an email tool, send a confirmation email; if not, store the signup and flag it.

**Counting.** A `hits` edge function records day, page, headline and traffic source, nothing about the person. Source comes from `?src=`, falling back to the referring domain. Tagged links for: friend, linkedin, lasalle, coaches, indiehackers, sideproject, instagram, tiktok, fr-groups, podcast.

A private scoreboard view, for JP only: weekly visitors, signups and purchases by headline and by source, plus signup and purchase rates. It should match the scoreboard in the launch plan.

**Legal pages, French first:** Terms, Privacy, Refunds and "What lifetime means". Drafts for JP to review. Placeholders:

- `[SELLER]`: JP or Studio Moka, decided by Nov 10
- `[SYNC TERM]`: how long sync is included, for example 3 years
- `[NOTICE]`: 60–90 days before any change

**Done when:**

- [ ] A test-mode and then a live $39 purchase work end to end in French and English. The webhook records the purchase and sets the entitlement, and a refund works.
- [ ] A waitlist signup is stored with consent, headline and source.
- [ ] Visits are counted by headline and source, and the scoreboard shows the week's totals.
- [ ] The page makes no third-party requests except the checkout, and the clip is self-hosted.
- [ ] Legal pages are live in both languages with French first, and JP has approved the copy.
- [ ] Lighthouse accessibility 90+, and the page reads fine with reduced motion.

## Sprint 1, Nov 16 to Dec 20: no-regret features

Improve the web app in ways that help JP's friend even if the pre-sale fails. Ship each feature to her as it lands, about two a week, in this order.

1. **A tick on every block.** A round tick in each block's corner, as in the original app. One tap or click marks it done, another undoes it; a done block takes its area's tint. The block happening now gets a heavier outline, "Now · 38 min left" and a line across the day at the current time. No Now/Next card, no Skip or Move buttons. An unticked block stays unticked, never red; blocks move by dragging, as today. Keep using the existing `done` field.
2. **Guardrail quotas.** Replace targets with three kinds of limit per area:

   | Kind | Example | How it shows |
   | --- | --- | --- |
   | Floor | Rest at least 10 h, people at least 4 h | Fills toward the floor; a shortfall shows in grey with neutral words |
   | Ceiling | Work at most 40 h | A gentle note when the plan passes it, never a warning colour |
   | Range | Projects 4–8 h | Full credit anywhere inside the range |

   Partial credit always shown ("Rest 7 of 10 h"). Each week starts fresh: shortfalls never carry over, roll forward copies the plan, never the debt. One optional unassigned buffer block per day in templates. Migrate existing quotas to floors.
3. **Balanced weeks instead of daily streaks.** A week is balanced when every floor is at least 80% met and no ceiling is passed by more than 10% (user-changeable defaults). One grace week per four doesn't break the count. Show "Balanced weeks this season: 5"; no flames, no broken-streak screens, no red.
4. **One panel for areas and tasks.** Desktop: the left panel lists each area with a drag handle, this week's balance ("Rest 7 of 10 h" and its bar) and its tasks, folding away per area. The panel can be hidden. Week switch and balanced-weeks count above the grid; templates, "Save as template" and roll forward below it. Phones: areas and tasks share a tray docked at the bottom with Areas and Tasks tabs. One tap folds it into a slim "Show areas and tasks" bar. Remember that choice on the device, not in sync.
5. **Tasks.** Keep the first version small. Tasks fill the week, but the balance still counts blocks, not tasks.

   | Rule | What happens |
   | --- | --- |
   | Tasks live under an area | Title, area, optional estimate. No due dates for now |
   | Drop a task on a block | It joins that block's to-do list, shown as checkboxes inside the block |
   | Drop it on empty time | It makes its own block, named after the task, as long as its estimate or the area's usual block |
   | One task, one tick | A block made from a single task shows one tick; ticking it finishes the task |
   | Unfinished tasks come back | When a block ends or is ticked, its unticked tasks go back to their list, marked "back from Tue", never into another block |
   | Tasks against planned time | Each area shows "7 h 15 of tasks · 6 h planned this week", in grey, never red |
   | Finished tasks | They leave the list; "Show 3 done this week" lists them |
   | Templates and roll forward | They copy blocks, never tasks |

   Store tasks as their own list in the saved data (schema version 2), with a migration from version 1, included in export, import and sync. Starting shape: `Task = { id, catId, title, estMins?, blockId?, done, doneAt?, returnedFrom?, order }`, plus `sourceTaskId?` on a block made from a task.
6. **Click or tap empty time to add.** Desktop: a small window beside the slot; phone: a bottom sheet. Both offer a length (30 min, 1 h, 1 h 30, 2 h), the user's areas, open tasks and a "New task" box. An area makes a block of the chosen length; a task makes a block from its estimate; a typed task goes under the area picked, then makes its block. Escape, close or tap outside closes with nothing changed. Dragging keeps working. If tapping empty time already does something, keep it working and check with JP before changing it.
7. **Welcome back.** After 7+ days without an edit: "Welcome back. Start this week fresh from a template?" One tap builds the week; "Not now" leaves everything as it was.
8. **Starter templates.** Three realistic, under-filled weeks (e.g. work-heavy, family, recovery), each with floors for rest and people and a work ceiling.
9. **French and English.** Every string in Canadian French and English files, language detection with a manual switch in settings, local date and time formats. JP reviews the French.
10. **Neutral stats.** Describe, don't judge: "Rest was lighter than your floor this week", not "You missed rest".
11. **Early-bird badge.** When a signed-in email has `early_bird = true`, show a small "Early bird" badge and a thank-you in settings. No feature gating yet.

**Done when:**

- [ ] JP's friend plans a full week on her iPhone without help, tasks included, and keeps using it for a week.
- [ ] Ticking or unticking a block takes one tap on a phone and one click on a computer.
- [ ] A task reaches the week three ways on phone and desktop: dropped on a block, dropped on empty time, or picked in the add window.
- [ ] Unit tests cover quota math (floors, ceilings, ranges, partial credit, balanced-week rules, grace weeks) and every migration.
- [ ] Unit tests cover the task rules: attaching, sizing from an estimate, the one-task tick, unfinished tasks coming back, the planned-time line.
- [ ] Her existing data survives every release, checked against a JSON export taken before each migration.
- [ ] Every screen works in French and English, with no hard-coded strings.
- [ ] `npm test`, `npm run lint` and `npm run build` pass, and `docs/PLAN.md` is up to date.

## Out of scope for these sprints

Ask JP first rather than building any of these:

- Native iPhone and Android apps, in-app purchases, widgets, push notifications (the post-Go brief)
- Calendar import or two-way calendar sync
- AI scheduling or auto-rescheduling
- Team, family or sharing features
- Paywalls or feature gating
- Any new paid service, or anything that adds a monthly cost
- Due dates, reminders, repeats, subtasks or priorities on tasks; importing tasks from other apps

## What JP does by hand

Claude Code flags these when blocked and keeps going on other work.

| By | Task |
| --- | --- |
| 2026-11-05 | Apply to the merchant of record (Paddle or Lemon Squeezy). Pick an email tool for waitlist emails, or decide to send them later |
| 2026-11-08 | Pick the name, buy the domain, point its DNS at GitHub Pages |
| 2026-11-10 | Decide who sells it (JP or Studio Moka) after the accountant call; fill in `[SELLER]`, `[SYNC TERM]`, `[NOTICE]` |
| 2026-11-12 | Record the 30-second clip of the app |
| 2026-11-14 | Review the French copy and legal pages, make one live $39 purchase and refund it |

Also: check the Supabase project is in, or can move to, the Canada region, and provide keys as environment variables, never in code.

## How Claude Code works on this

1. Read the repo docs and follow `CLAUDE.md`. Keep this brief in `docs/` and its tasks in `docs/PLAN.md`.
2. Before writing code for sprint 0, reply with a short plan (site setup, data tables, order of work) and wait for JP's OK.
3. Small, reviewable changes, one feature at a time, with tests where there's logic.
4. Keep `npm test`, `npm run lint` and `npm run build` passing on every change.
5. Never commit secrets; use environment variables and GitHub repository variables.
6. Before any change that touches stored data, export the friend's data shape and test the migration on it.
7. End each work session with a five-line summary: what shipped, what's next, what's blocked on JP, what to test on the phone.
