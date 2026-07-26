# order-notify — buyer order-status emails

Sends the buyer a short email when their order hits a milestone: **quote sent**,
**payment confirmed**, **payment rejected**, **site delivered**. Nothing else
emails. Fired by a database webhook on `order_events`; sends through **Resend**.

This is the one piece of the project that needs infrastructure you set up once.
Everything below is done by you — the code is already in the repo.

## 1. Resend account (2 min)
1. Sign up at https://resend.com (free tier is plenty).
2. **API Keys → Create** → copy the key (starts `re_…`).
3. Sender address:
   - Fastest: use `onboarding@resend.dev` as the FROM — works immediately, only
     deliverable to *your own* Resend account email (fine for testing).
   - Real: **Domains → Add** `websale.az`, add the DNS records Resend shows, then
     use something like `WebSale.az <salam@websale.az>`.

## 2. Install the Supabase CLI + log in
```bash
brew install supabase/tap/supabase   # or: npm i -g supabase
supabase login                        # opens the browser
supabase link --project-ref jydmyuhvmgolslqesipz
```

## 3. Set the function secrets
Pick any long random string for `NOTIFY_SECRET` (it just has to match the webhook
header in step 5).
```bash
supabase secrets set \
  RESEND_API_KEY=re_your_key_here \
  NOTIFY_SECRET=$(openssl rand -hex 24) \
  FROM_EMAIL='WebSale.az <onboarding@resend.dev>' \
  SITE_URL=https://websale-gules.vercel.app
```
`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically — don't
set them. Note the `NOTIFY_SECRET` value you generated; you need it in step 5.
(See it later with `supabase secrets list` — value is hidden, so keep your own copy.)

## 4. Deploy the function
```bash
supabase functions deploy order-notify --no-verify-jwt
```
`--no-verify-jwt` because the webhook authenticates with the secret header, not a
user token. The function URL is:
`https://jydmyuhvmgolslqesipz.supabase.co/functions/v1/order-notify`

## 5. Wire the database webhook
Supabase dashboard → **Database → Webhooks → Create a new hook**:
- **Table:** `order_events`  **Events:** `Insert`
- **Type:** `HTTP Request` → **POST** → the function URL above
- **HTTP Headers:** add `x-notify-secret` = the `NOTIFY_SECRET` from step 3
- Save.

The function ignores every status except the four above, so it's safe that the
webhook fires on all inserts.

## 6. Test
- Sign in as a buyer whose email you can read, place a ready-made order → you land
  in `awaiting_payment` (no email — correct). As the owner, confirm a payment or
  mark it delivered → the buyer gets an email.
- Watch logs: `supabase functions logs order-notify` (or the dashboard).

## Editing the copy
All wording is Azerbaijani, in the `COPY` map at the top of `index.ts`. Change it,
then re-run step 4. (Adding EN/RU per-user would need a stored locale on the
profile — not there today.)
