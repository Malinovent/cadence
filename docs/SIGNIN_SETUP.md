# Sign-in and Pro setup

Sign-in is Google (and Apple), or an email and password account. Google and Apple are buttons that stay hidden until
you finish their part and switch them on (part 4). Do Google first: it's free. Apple needs a paid
Apple Developer account ($99 USD a year).

Never paste a secret (client secret, .p8 key) into a chat or a file.

## 1. Turn on Pro in the database (do this first)
1. Supabase → **SQL Editor** → paste the whole of `supabase/schema.sql` → **Run**.
2. From now on, sync needs Pro. Everyone who already syncs keeps it (they get `pro = true`).
3. To give Pro to someone by hand (a friend, yourself):
   ```sql
   insert into public.entitlements (email, pro) values ('their@email.com', true)
   on conflict (email) do update set pro = true;
   ```
4. Check who has Pro: `select email, pro, early_bird from public.entitlements;`

## 2. Google
1. Go to https://console.cloud.google.com → create a project named **Rebalance**.
2. **APIs & Services → OAuth consent screen** (or **Google Auth Platform → Branding**):
   - User type **External**, app name **Rebalance**, support email jphil.provost@outlook.com.
   - Authorized domain: `supabase.co`.
   - Scopes: leave the defaults (email, profile).
   - **Audience → Publish app** so anyone can sign in, not only test users.
3. **Clients** (or **Credentials → Create credentials → OAuth client ID**):
   - Type **Web application**, name `Rebalance web`.
   - Authorized JavaScript origins: `https://rebalanceweek.com` and `https://malinovent.github.io` (the old address)
   - Authorized redirect URI: `https://qbivyiyclkpwecuruvst.supabase.co/auth/v1/callback`
   - **Create**, then copy the **Client ID** and **Client secret**.
4. Supabase → **Authentication → Sign In / Providers → Google** → enable, paste both → **Save**.

## 3. Apple (optional, paid)
1. https://developer.apple.com/account → **Certificates, Identifiers & Profiles**.
2. **Identifiers → +** → **App IDs** → App → description `Rebalance`, bundle ID
   `com.rebalanceweek.app`, tick **Sign in with Apple** → Register.
3. **Identifiers → +** → **Services IDs** → description `Rebalance web`, identifier
   `com.rebalanceweek.web` → Register. Open it, tick **Sign in with Apple** → **Configure**:
   - Primary App ID: `com.rebalanceweek.app`
   - Domains: `qbivyiyclkpwecuruvst.supabase.co`
   - Return URL: `https://qbivyiyclkpwecuruvst.supabase.co/auth/v1/callback`
4. **Keys → +** → name `Rebalance sign-in`, tick **Sign in with Apple** → Configure → the App ID
   → Register → **Download** the `.p8` file (only once). Note the **Key ID** and your **Team ID**
   (top right of the page).
5. Supabase → **Authentication → Sign In / Providers → Apple** → enable:
   - Client IDs: `com.rebalanceweek.web`
   - Secret key: Supabase's Apple page links to a generator that turns the .p8, Key ID and Team
     ID into the secret. **It expires after 6 months**: put a reminder to make a new one.
6. Note: people can choose "Hide my email" with Apple. Their account email is then an
   `@privaterelay.appleid.com` address, which won't match the email they paid with. The app tells
   them to sign in with the email they bought with.

## 4. Switch the buttons on (GitHub)
https://github.com/Malinovent/cadence → **Settings → Secrets and variables → Actions →
Variables → New repository variable**:

| Name | Value |
|---|---|
| `VITE_AUTH_PROVIDERS` | `google` (or `google,apple` once Apple is done) |
| `VITE_SITE_URL` | `https://rebalanceweek.com` (the "Get Pro" button and legal links) |
| `VITE_SUPPORT_EMAIL` | `jphil.provost@outlook.com` |

Then **Actions → Deploy to GitHub Pages → Run workflow**.

## 5. Check
- Settings → Sync → **Sign in**: the Google (and Apple) button shows above the email code.
- Signed in with an email that has Pro: "Everything's synced."
- Signed in with an email without Pro: "Sync is part of Pro", a **Get Pro** button, and the hint
  to sign in with the email they bought with.

## 6. Email and password accounts (2026-11-17)
Supabase → **Authentication**:
1. **Sign In / Providers → Email**: enabled, **Confirm email** ON (Pro follows the email: an address must be
   confirmed before it can sign in), **Minimum password length** 8. Save.
2. **Emails → Templates → Confirm signup**: subject `Confirm your Rebalance account`, body:
   ```html
   <h2>Confirm your Rebalance account</h2>
   <p><a href="{{ .ConfirmationURL }}">Confirm my email</a></p>
   <p>Then go back to Rebalance and sign in with your email and password.</p>
   ```
3. **Emails → Templates → Reset password**: subject `Choose a new Rebalance password`, body:
   ```html
   <h2>Choose a new password</h2>
   <p><a href="{{ .ConfirmationURL }}">Choose a new password</a></p>
   <p>Didn't ask for this? You can ignore this email.</p>
   ```
4. The old Magic Link template (with the code) is no longer used.
5. **URL Configuration**: Site URL `https://rebalanceweek.com/app/`; Redirect URLs list
   `https://rebalanceweek.com/app/**` and still `https://malinovent.github.io/cadence/**` (see `docs/DOMAIN_MOVE.md`).
