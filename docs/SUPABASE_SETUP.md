# Setting up sync (Supabase)

This guide connects Cadence to a free Supabase project so your weeks sync between your phone and computer. It takes about 15 minutes and you only do it once. You don't need to write any code.

Until you finish it, Cadence keeps working exactly as before: everything stays on the device, and no account options appear.

Supabase changes its dashboard now and then. If a button has a slightly different name than written here, look for the closest match in the same area.

---

## Part 1 — Create the Supabase project

1. Go to **https://supabase.com** and sign in (or create a free account; signing in with GitHub is easiest).
2. Click **New project**.
3. Fill in the form:
   - **Name**: `cadence` (any name works).
   - **Database password**: click **Generate a password**. Cadence never uses this password, so you don't need to remember it. Saving it in your password manager is still a good idea.
   - **Region**: pick one close to you, such as **Canada (Central)** or **East US (North Virginia)**.
   - **Plan**: Free.
4. Click **Create new project** and wait a minute or two while it gets ready.

## Part 2 — Copy the two values Cadence needs

You need two values: the **Project URL** and the **public key**. Both are safe to share. They identify your project, and the database rules from Part 3 keep your data private.

5. In the left sidebar, open **Project Settings** (the gear icon at the bottom).
6. Find the **Project URL**. It looks like `https://abcdefghijklm.supabase.co`. Depending on the dashboard version it's on the **Data API** page or the **API** page. The **Connect** button at the top of the dashboard shows it too. Copy it somewhere handy.
7. Open the **API Keys** page (on older dashboards, the same **API** page). Copy the **publishable** key (starts with `sb_publishable_`). If you only see a key labelled **anon** / **public**, copy that one. Either works.
   - Do **not** use the **secret** or **service_role** key anywhere. That one really is secret.

## Part 3 — Create the database table

8. In the left sidebar, open **SQL Editor**.
9. Start a new query (there's a **+** / **New query** button).
10. Open the file `supabase/schema.sql` from this project, copy **all** of it, and paste it into the editor.
11. Click **Run** (or press Ctrl+Enter / Cmd+Enter).
    - Supabase may warn that the query contains "destructive operations" (it replaces its own access rules). That's expected. Confirm and run it.
    - You should see **Success. No rows returned**.
    - Running it again later is safe and changes nothing.
    - **Already set up before Nov 7, 2026?** Run the whole file once more: it adds `delete_my_account()`, which Settings → Account & sync → "Delete my account" needs. Until then that button answers that it couldn't delete the account.

## Part 4 — Email sign-in

Cadence signs you in with your email, with no password. Each email has a sign-in link **and** a numeric code (6 to 8 digits, depending on your project). The code matters on iPhone: an app saved to the home screen can't receive links from Mail (they open in Safari instead), so there you type the code.

12. In the left sidebar, open **Authentication**.
13. Open **Sign In / Providers** (on older dashboards: **Providers**) and click **Email**:
    - **Enable Email provider** (or **Enable email signup**) must be **on**.
    - **Confirm email** can stay on.
    - If there's an **Email OTP Length** setting, make sure it's **6**.
    - Click **Save** if you changed anything.
14. Open **URL Configuration**:
    - **Site URL**: `https://malinovent.github.io/cadence/`
    - Under **Redirect URLs**, click **Add URL** and add each of these two (one at a time):
      - `https://malinovent.github.io/cadence/**`
      - `http://localhost:5173/cadence/**`
    - Click **Save**.
15. Open **Emails** (on older dashboards: **Email Templates**), then the **Templates** tab if there is one.
    - **If it says you need custom SMTP to edit templates:** on the free plan, Supabase only lets you change the email text once the emails go out through your own mail account. The simplest free option is your Gmail:
      1. In your Google Account, turn on **2-Step Verification** (Security → 2-Step Verification) if it isn't already on.
      2. Go to **https://myaccount.google.com/apppasswords**, create an app password named `Cadence`, and copy the 16-character password it shows.
      3. In Supabase: **Authentication → Emails → SMTP Settings**, turn on **Enable custom SMTP**, and fill in:
         - **Sender email**: your Gmail address. **Sender name**: `Cadence`
         - **Host**: `smtp.gmail.com`. **Port**: `465`
         - **Username**: your full Gmail address. **Password**: the 16-character app password (no spaces)
      4. Click **Save**. The **Templates** tab is now editable. Sign-in emails will come from your Gmail address.
      5. Optional: under **Authentication → Rate Limits**, the email limit can be raised (for example to 30 per hour) now that your own account sends them.
16. Open the **Magic Link** template. A template holds one text, so it carries both languages, French first (the brief's French-first rule).
    - **Subject**: `Votre connexion à Cadence / Your Cadence sign-in`
    - Replace the whole **body** (switch to the source/HTML view if you see one) with:

    ```html
    <h2>Votre connexion à Cadence</h2>
    <p>Voici le chemin de retour vers votre semaine.</p>
    <p>Sur cet appareil, touchez le lien :</p>
    <p><a href="{{ .ConfirmationURL }}">Se connecter à Cadence</a></p>
    <p>Ou entrez ce code dans Cadence :</p>
    <p style="font-size:28px;letter-spacing:6px;font-family:monospace;"><strong>{{ .Token }}</strong></p>
    <p>Vous utilisez Cadence depuis l'écran d'accueil de votre iPhone? Entrez le code. Le lien ouvrirait Safari.</p>
    <p>Le code ne fonctionne qu'une fois et expire bientôt. Si vous n'avez rien demandé, ignorez ce courriel.</p>
    <hr>
    <h2>Your Cadence sign-in</h2>
    <p>Here's your way back to your week. Tap the link above, or type the same code in Cadence.</p>
    <p>Using Cadence from your iPhone home screen? Type the code. The link would open Safari instead.</p>
    <p>The code works once and expires soon. If you didn't ask for this, you can ignore this email.</p>
    ```

    - If the name changes, replace "Cadence" in the subject and body here too.
    - Click **Save**.
17. Open the **Confirm signup** template and replace its subject and body the same way, with the exact same text. The very first time you sign in, Supabase sends this email instead of the Magic Link one, so it needs the code too.

> **About email limits:** the free plan's built-in email sender only sends a few emails per hour. For one person signing in on a couple of devices that's plenty. If you ever see a "too many requests" error, wait an hour and try again.

## Part 5 — Give the values to the live site (GitHub)

The live app is built by GitHub, so GitHub needs the two values from Part 2.

18. Open **https://github.com/Malinovent/cadence**.
19. Click **Settings** (top of the repo page), then in the left sidebar **Secrets and variables** → **Actions**.
20. Click the **Variables** tab. Use Variables, not Secrets: these values are public, and the build needs to read them.
21. Click **New repository variable** and add:
    - **Name** `VITE_SUPABASE_URL`, **Value**: the Project URL from step 6.
22. Click **New repository variable** again and add:
    - **Name** `VITE_SUPABASE_ANON_KEY`, **Value**: the publishable (or anon) key from step 7.
23. Rebuild the site: open the **Actions** tab, click **Deploy to GitHub Pages** on the left, then **Run workflow** → **Run workflow**. Wait for the green check (about two minutes).

## Part 6 — For local development (optional)

24. In the project folder, copy `.env.example` to a new file named `.env.local`.
25. Paste the two values after the `=` signs:

    ```
    VITE_SUPABASE_URL=https://abcdefghijklm.supabase.co
    VITE_SUPABASE_ANON_KEY=sb_publishable_...
    ```

26. Restart `npm run dev`. `.env.local` is never committed to git.

---

## How to check it worked

- **Database:** in Supabase, open **Table Editor**. You should see a table named `cadence_state`, marked as protected by RLS (Row Level Security). It stays empty until you sign in for the first time.
- **Sign-in:** open https://malinovent.github.io/cadence/, go to **Settings** → **Account & sync**, enter your email, and tap **Send me a code**. Within a minute you get an email with a link and a code. Typing the code signs you in, and the header shows **synced**. (The account screen ships in the next Cadence update. Until then, the site looks the same as before.)
- **Data arrived:** back in **Table Editor** → `cadence_state`, there's now one row: your schedule.
- **Second device:** sign in on your phone with the same email. Your week appears. If the phone already had a different schedule, Cadence asks which one to keep.
- **Something's off?**
  - No email: check spam, and wait for the hourly email limit to reset.
  - The link opens the app but you're not signed in: make sure step 14's Redirect URLs are saved exactly as written, including the `/**`.
  - No account options in the app at all: the GitHub variables from Part 5 are missing or misspelled, or the site wasn't rebuilt after adding them (step 23).
