# Sign-in first, with passwords (short design)

Date: 2026-11-17 · Asked by JP · Approved by JP with three changes (no email codes, own accounts with a
password, French off for now), folded in below.

## Intent
When someone opens Rebalance and isn't signed in, the first thing they see is a sign-in screen,
not a planner with sign-in hidden in Settings. Signing in stays optional: a quiet link lets them use
the app on this device without an account (JP chose option A). Signing in is the usual kind:
Google, or an email and password account that belongs to Rebalance. No more emailed codes.
The app shows English only until JP asks for French back.

## Goals
- A full-screen sign-in page on opening the app, for anyone not signed in who hasn't chosen to skip it on this device.
- Continue with Google (and Apple once switched on).
- Email + password: **Sign in**, **Create an account**, **Forgot your password?**
- "Continue without an account": the app as today; sign-in stays in Settings → Sync (same form).
- French switched off by one flag: the app always shows English and hides the language pickers. `fr.ts` stays, untouched, for later.

## Non-goals
- No required accounts, no change to Pro, sync, the database or the conflict choice.
- No change to the app's address, base path or `cadence:*` data keys.
- No "change password" while signed in (Forgot your password covers it), no username, no 2FA.
- The site's "Log in" link and the site's French pages (separate step, site repo).

## Anti-goals
- A flash of the sign-in page for someone already signed in, or while coming back from Google or an email link.
- Losing or hiding anyone's local weeks.
- Someone getting another person's Pro by signing up with their email: Pro follows the email, so
  **"Confirm email" must stay on in Supabase** (an account only signs in once its email is confirmed).

## Approaches
1. **A new sign-in page before everything else, sharing one `SignInForm` with Settings (chosen).** One sign-in flow to maintain.
2. Put sign-in on the existing intro (purpose) page. Rejected: people who already use the app never see that page.
3. Open Settings automatically on launch. Rejected: feels like a bug, not a front door.

For passwords: Supabase's own email + password auth (`signUp`, `signInWithPassword`,
`resetPasswordForEmail`, `updateUser`). It's already the auth backend; no new service.

## Design
- **When it shows** (pure function in `src/lib/`, unit-tested): sync is configured, the sync state is
  ready (session known: no flash, also on return from Google or an email link), nobody is signed in,
  and this device hasn't skipped it. Also shown, whatever else, when the person arrives from a
  "reset your password" link: then it's the "Choose a new password" step.
- **Skipping:** remembered per device in `cadence:ui:signin-skipped` (a UI pref like
  `cadence:ui:onboarded`, not a data key). Signing out doesn't set it.
- **Order:** sign-in page first; then, for new people, the existing intro page and guided first block,
  unchanged. The intro page's "Sign in instead" link goes.
- **Existing local users** (JP's friend): see the page once on their next open; one tap on
  "Continue without an account" and it's gone on that device.
- **People who signed in with a code before:** they have no password. "Forgot your password?" sets
  one, or Continue with Google with the same Gmail address lands in the same account.
- **The form** (page and Settings):
  - Continue with Google (+ Apple when on), then a divider "or".
  - Email, password (shown as dots, a Show toggle), button **Sign in**; links **Forgot your password?**
    and **Create an account**.
  - Create an account: email, password (at least 8 characters), button **Create account**, link
    **I already have an account**. Then: "Check your email to confirm your account, then sign in
    here." (Same message whether or not the email already had an account, so nobody can probe emails.)
  - Forgot your password: email, button **Send me a reset link**, then "If there's an account for
    that email, a link to choose a new password is on its way."
  - Choose a new password (arriving from the link): new password, button **Save password**, then signed in.
  - Errors in the existing error style: wrong email or password; email not confirmed yet; too many
    tries, wait a minute; offline.
- **iPhone home-screen app:** email links open in Safari, not the installed app. That's fine with
  passwords: confirming or resetting in Safari changes the account, then the person signs in with
  the password in the installed app.
- **Look:** full-screen like the intro page, same `S.*` styles. Sketch:

  ```
            Rebalance
   Plan a week that keeps room for your life.

   [ G  Continue with Google        ]
   ───────────── or ─────────────
   [ you@example.com               ]
   [ ••••••••               Show   ]
   [            Sign in            ]
   Forgot your password? · Create an account

        Continue without an account
   Your weeks stay on this device.
  ```

- **French off:** `FRENCH_ON = false` in `src/i18n/lang.ts`. Every language choice resolves to English,
  and the FR / EN pickers (intro page, Settings) are hidden while only one language is on.

## Supabase settings JP checks (no code)
- Authentication → Sign In / Providers → Email: enabled, **Confirm email on**, minimum password length 8.
- Authentication → Emails: the "Confirm signup" and "Reset password" templates in English, with the link
  (the code-based templates go). Custom SMTP stays as set up.
- Redirect URL `https://malinovent.github.io/cadence/` already allowed.

## New wording (EN only for now)
Line "Plan a week that keeps room for your life." · "Continue without an account" · "Your weeks stay on
this device." · the form labels and messages above.

## Left to the builder
Component and hook names, focus handling (same pattern as `PurposePage`), tests for the show-rule, the
skip pref, the engine's new auth actions and the French flag, SPEC.md and filemap.md updates, and a
browser check on phone and desktop widths.
