# Sign-in First, with Passwords — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A full-screen sign-in page when the app opens signed out (Google, or email + password, or "Continue without an account"); emailed codes removed; French switched off by one flag.

**Architecture:** The sync engine swaps its code actions for password actions (sign in, create account, reset link, new password) and reports a `recovery` flag when someone arrives from a reset link. A pure gate decides when the page shows. One `SignInForm` serves both the new `SignInPage` and Settings → Sync.

**Tech Stack:** React 18 + TS strict, supabase-js auth, Vitest.

**Spec:** `docs/superpowers/specs/2026-11-17-sign-in-first-design.md`

## Global Constraints
- Address, `/cadence/` base path and `cadence:*` data keys unchanged; skip pref key is `cadence:ui:signin-skipped`.
- Business logic in `src/lib/` as pure tested functions; components render and wire.
- Styles only from `S.*` in `src/styles.ts`; no new tokens.
- Never call a setter or side effect inside a React state updater.
- Password minimum 8 characters.
- English copy exactly as in the spec; `fr.ts` keeps compiling (French strings for new keys, unused while French is off).
- Update `filemap.md` for new files.

## Review Focus
- Opening the app signed in (or returning from Google / an email link) must never flash the sign-in page → gate test: `ready: false` → hidden.
- Arriving from a reset link while "skipped" on this device still shows "Choose a new password" → gate test: `recovery: true, skipped: true` → shown.
- Sign-up with an email that already has an account shows the same "check your email" message, never an error → engine test: `signUp` resolving with no session → `{ ok: true }`.
- Wrong password vs. unconfirmed email give different messages → client error-mapping test.
- A saved language choice of "fr" while French is off still shows English → lang test.

---

### Task 1: French off

**Files:** Modify `src/i18n/lang.ts`, `src/components/PurposePage.tsx`, `src/components/SettingsView.tsx` (LanguageRow) · Test `src/i18n/i18n.test.ts`

**Interfaces — Produces:** `export const FRENCH_ON = false`; `export const LANGS_ON: readonly Lang[]` (`["en"]` while off); `resolveLang` returns `"en"` whenever `!FRENCH_ON`.

- [ ] Tests: `resolveLang("fr", ["fr-CA"]) === "en"`, `resolveLang("auto", ["fr-CA"]) === "en"`, `LANGS_ON` equals `["en"]`. Run `npx vitest run src/i18n` → FAIL.
- [ ] Implement in `lang.ts`; hide the PurposePage FR/EN switch and Settings LanguageRow when `LANGS_ON.length < 2`.
- [ ] `npx vitest run src/i18n` → PASS. Commit "French off for now (one flag); pickers hidden".

### Task 2: Password auth in the client and engine

**Files:** Modify `src/sync/engine.ts`, `src/sync/supabaseClient.ts`, `src/sync/useSync.ts`, `src/lib/syncUi.ts`, `src/i18n/en.ts`, `src/i18n/fr.ts` (lib words) · Test `src/sync/engine.test.ts`, `src/lib/syncUi.test.ts`

**Interfaces — Produces:**
- `SyncErrorKind = "network" | "rate_limited" | "bad_credentials" | "not_confirmed" | "weak_password" | "failed"`; `AuthResult` reasons = the same with `"offline"` for network.
- `SyncClient`: remove `sendCode`, `verifyCode`; add `signInPassword(email, password): Promise<SyncSession>`, `signUp(email, password, redirectTo): Promise<void>`, `sendReset(email, redirectTo): Promise<void>`, `setPassword(password): Promise<void>`; `onAuthChange(cb: (s: SyncSession | null, recovery: boolean) => void)`.
- `SyncState.recovery: boolean` (true after a `PASSWORD_RECOVERY` event until `setPassword` succeeds).
- `SyncEngine` / `SyncActions`: `signIn(email, password)`, `signUp(email, password)`, `sendReset(email)`, `setPassword(password)`, all `Promise<AuthResult>`.
- `syncUi.ts`: `isValidPassword(pw) => pw.length >= 8`; `isValidCode` removed; `authErrorMessage` covers the new reasons.

- [ ] Engine tests (fake client in `engine.test.ts`): `signIn` sets the session; `signUp` with no error → `{ ok: true }` and no session; `sendReset` passes `redirectTo`; a recovery auth change sets `recovery: true` and `setPassword` clears it; client throwing `SyncError("bad_credentials")` → `{ ok: false, reason: "bad_credentials" }`. `syncUi` tests: `isValidPassword("1234567") === false`, `("12345678") === true`. Run → FAIL.
- [ ] Implement. Supabase mapping in `authError`: code `invalid_credentials` → `bad_credentials`, `email_not_confirmed` → `not_confirmed`, `weak_password` → `weak_password`, 429 / rate-limit codes → `rate_limited`. `signUp` uses `options.emailRedirectTo`; `sendReset` uses `resetPasswordForEmail(email, { redirectTo })`; `setPassword` uses `updateUser({ password })`. Messages (EN): bad_credentials "That email and password don't match.", not_confirmed "Confirm your email first: the link is in your inbox.", weak_password "Use at least 8 characters.".
- [ ] `npm test` → PASS. Commit "Sync: email and password sign-in, create account and reset; no more emailed codes".

### Task 3: Gate and skip pref

**Files:** Create `src/lib/signInGate.ts`, `src/state/signInPrefs.ts` · Test `src/lib/signInGate.test.ts`

**Interfaces — Produces:** `shouldShowSignIn(s: { configured: boolean; ready: boolean; signedIn: boolean; skipped: boolean; recovery: boolean }): boolean`; `readSignInSkipped(): boolean`, `writeSignInSkipped(): void` (key `cadence:ui:signin-skipped`, try/catch like `onboardingPrefs.ts`).

- [ ] Tests: shown when configured+ready+signed out+not skipped; hidden when `ready: false`, when signed in, when skipped, when not configured; shown when `recovery: true` even if skipped or signed in. Run → FAIL.
- [ ] Implement. Run → PASS. Commit "Sign-in gate: when the first screen shows".

### Task 4: SignInForm, shared with Settings

**Files:** Create `src/components/SignInForm.tsx`; modify `src/components/AccountSync.tsx`, `src/i18n/en.ts`, `src/i18n/fr.ts`

**Interfaces — Consumes:** Task 2 actions. **Produces:** `SignInForm({ providers, recovery, signIn, signUp, sendReset, setPassword, signInWith, autoFocus? })`. Steps: `signin` (default), `signup`, `forgot`, `checkEmail`, `resetSent`, `newPassword` (forced while `recovery`).

- [ ] Build per the spec's "The form": Google/Apple buttons, divider "or", email + password with Show toggle, links "Forgot your password?" / "Create an account" / "I already have an account", messages "Check your email to confirm your account, then sign in here." and "If there's an account for that email, a link to choose a new password is on its way." Inputs `autoComplete` `email` / `current-password` / `new-password`. Remove the code step and `sendCode`/`verifyCode` props from `AccountSync`; drop the now-unused message keys (`sendCode`, `checkEmail`, `code`, `differentEmail`, `orEmail`, `emailOnly`) in both language files.
- [ ] `npm run lint` and `npm run build` → clean. Commit "SignInForm: Google or email and password, used by Settings".

### Task 5: SignInPage first

**Files:** Create `src/components/SignInPage.tsx`; modify `src/App.tsx`, `src/components/PurposePage.tsx`, `src/state/useOnboarding.ts`, `src/i18n/en.ts`, `src/i18n/fr.ts`

**Interfaces — Consumes:** Tasks 2–4.

- [ ] `SignInPage` full-screen like `PurposePage` (same overlay styles, focus trap pattern), with `APP_NAME`, line "Plan a week that keeps room for your life.", `SignInForm`, then "Continue without an account" and "Your weeks stay on this device.".
- [ ] App: compute `shouldShowSignIn` from `useSync` state + `readSignInSkipped()` held in `useState`; skip → `writeSignInSkipped()` and hide. While it shows, `PurposePage` waits. Remove PurposePage's `canSignIn`/`onSignIn` link and `onb.signIn`.
- [ ] `npm test`, `npm run lint`, `npm run build` → clean. Commit "The app opens on sign-in when signed out; continue without an account".

### Task 6: Docs, browser check, deploy

**Files:** Modify `docs/SPEC.md` (sync UI section), `docs/SIGNIN_SETUP.md` (Supabase email settings and English templates for Confirm signup and Reset password), `docs/PLAN.md`, `filemap.md`

- [ ] Update docs. Commit "Docs: sign-in first, passwords, French off".
- [ ] `npm run dev` preview: signed-out page shows at phone and desktop widths; skip hides it and survives reload; Settings → Sync shows the same form; no console errors.
- [ ] After JP's OK, push `main`; check the deploy run succeeds and the live app shows the page.
