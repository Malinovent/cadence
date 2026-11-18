# Moving the app to rebalanceweek.com

Since 2026-11-18 the app lives at **https://rebalanceweek.com/app/**. The site stays at the root
(landing page, pricing, Terms, Privacy, Refunds, Contact) and the two share one deploy.

The old address, **https://malinovent.github.io/cadence/**, stays up. A browser keeps each
address's weeks apart, so people's weeks don't follow by themselves. Once the move card is on
(step 5), the old address shows **"Rebalance has moved"** with a **Bring my weeks there** button:
it opens the new address and passes the weeks across (not in the link). The new address asks
before replacing anything, and the old one keeps its copy. If that can't work (an installed phone
app opening Safari, say), **Download a copy** there, then **Settings → Import from file** here.
Signing in and syncing also works.

## How it's built
- `Malinovent/rebalance-site` has the domain. Its deploy builds the site, then builds the app from
  `Malinovent/cadence` (main) with `VITE_BASE=/app/` and puts it in `/app/`.
- `Malinovent/cadence`'s own deploy keeps the old address. With `VITE_MOVED_TO` set it shows the move card.
- After each app deploy, the cadence repo asks the site to rebuild, so `/app/` gets the change. That needs
  the `SITE_DISPATCH_TOKEN` secret (step 6). Without it: rebalance-site → **Actions → Deploy to GitHub
  Pages → Run workflow**.

## Going live, in this order
1. **Push the app** (`Malinovent/cadence`). The old address looks the same: no card yet.
2. **Give the site the app's settings**: rebalance-site → Settings → Secrets and variables → Actions →
   Variables. Use the same values as the cadence repo's `VITE_*` ones:
   `APP_SUPABASE_URL`, `APP_SUPABASE_ANON_KEY`, `APP_SUPPORT_EMAIL`, `APP_AUTH_PROVIDERS`.
3. **Push the site.** Its deploy builds rebalanceweek.com with the app at `/app/`.
4. **Supabase → Authentication → URL Configuration** (JP):
   - **Site URL**: `https://rebalanceweek.com/app/`
   - **Redirect URLs → Add URL**: `https://rebalanceweek.com/app/**`
   - Keep `https://malinovent.github.io/cadence/**` and `http://localhost:5173/cadence/**`.

   Without these, Google sign-in and the links in sign-up and reset emails go back to the old address.
   **Google Cloud → Clients → Rebalance web → Authorized JavaScript origins**: add `https://rebalanceweek.com`.
5. **Check https://rebalanceweek.com/app/**: it opens, signs in with email and password and with Google.
   Then turn the move card on: cadence repo → Variables → `VITE_MOVED_TO` = `https://rebalanceweek.com/app/`,
   then Actions → Deploy to GitHub Pages → Run workflow.
6. **Optional, so `/app/` updates by itself**: GitHub → your picture → Settings → Developer settings →
   Personal access tokens → **Fine-grained tokens → Generate new token**:
   - Name `rebalance-site rebuild`, expiry 1 year
   - Repository access: only `Malinovent/rebalance-site`
   - Permissions: **Contents: Read and write** (that's what lets it ask for a rebuild)

   Copy it, then in a terminal: `gh secret set SITE_DISPATCH_TOKEN -R Malinovent/cadence` and paste it
   when asked. It never goes in a file or a chat.

## Later
- After Paddle approves the domain, the root can become the app and the landing page move to `/landing/`.
- Once everyone has moved, the old address can go: Settings → Pages on the cadence repo → unpublish.
