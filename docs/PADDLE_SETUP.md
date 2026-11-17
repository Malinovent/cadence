# Paddle setup for Rebalance

Do everything in the **sandbox** (test mode) first, then repeat steps 2 to 6 in the **live** account.
Sandbox: https://sandbox-login.paddle.com/signup · Live: https://login.paddle.com/signup

Never paste a secret key (API key, webhook secret) into a chat or a file. Only the two values in
step 7 are safe to send.

## 1. Account (live only)
1. Sign up with jphil.provost@outlook.com as a **sole proprietor**, business name Rebalance.
2. Fill in **Business details**, **Identity verification** and **Payouts** (your bank). Paddle asks for these itself.
3. **Checkout → Website approval** → add `https://rebalanceweek.com`. Do this once the site is live over HTTPS.

## 2. Product and price
1. **Catalog → Products → New product**
   - Name: `Rebalance Early Bird (lifetime)`
   - Tax category: `Standard digital goods`
2. In that product, **New price**
   - Type: **One-time**
   - Amount: **39.00 USD**
   - Description: `Lifetime Pro: sync across your devices`
3. Copy the price ID (starts with `pri_`).

## 3. Default payment link
**Checkout → Checkout settings → Default payment link** → `https://rebalanceweek.com/` → Save.

## 4. Client-side token (for the Buy button)
**Developer tools → Authentication → Client-side tokens → New** → name it `site`.
Copy it (starts with `test_` in sandbox, `live_` in live).

## 5. API key (for the webhook, secret)
**Developer tools → Authentication → API keys → New**
- Name: `supabase-webhook`
- Permissions: **Customers: read**, **Transactions: read**, **Adjustments: read**

Copy the key straight into Supabase (step 7). Paddle shows it only once.

## 6. Webhook (tells Rebalance someone paid or got refunded)
**Developer tools → Notifications → New destination**
- Type: **Webhook**
- URL: `https://qbivyiyclkpwecuruvst.supabase.co/functions/v1/paddle-webhook`
- Events: `transaction.completed`, `adjustment.created`, `adjustment.updated`

Save, open the destination and copy its **secret key** (starts with `pdl_ntfset_`).

## 7. Hand-off
**Supabase → Project settings → Edge Functions → Secrets → Add**:

| Name | Value |
|---|---|
| `PADDLE_API_KEY` | the key from step 5 |
| `PADDLE_WEBHOOK_SECRET` | the secret from step 6 |
| `PADDLE_ENV` | `sandbox` (later `live`) |

Then send Claude these two values (both are public, safe to share):
- the **client-side token** (step 4)
- the **price ID** (step 2)

## 8. Database and webhook (once)
1. Supabase → **SQL Editor**: run `rebalance-site/supabase/presale.sql`, then `cadence2/supabase/schema.sql`
   (purchases, Pro, and sync only with Pro; see `docs/SIGNIN_SETUP.md` part 1).
2. In a terminal, in `D:\Custom Apps\rebalance-site`:
   ```
   npx supabase login
   npx supabase link --project-ref qbivyiyclkpwecuruvst
   npx supabase functions deploy paddle-webhook
   ```

Once you send Claude the token and price ID, they go into the site's GitHub variables
(`VITE_PADDLE_CLIENT_TOKEN`, `VITE_PADDLE_PRICE_ID`, `VITE_PADDLE_ENV`) and the Buy button opens
Paddle's checkout.

## 9. Test (sandbox)
Buy on the site with card `4242 4242 4242 4242`, any future date, CVC `100`.
Then sign in to the app with the same email: sync should turn on.
Refund it from **Transactions → … → Refund**: sync turns off again.
