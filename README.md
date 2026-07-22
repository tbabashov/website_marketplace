# WebSale.az

A marketplace and portfolio for a one-person web studio in Baku. It does three
things: shows past work, sells finished websites, and takes custom build
requests through quote → build → payment → handover.

The site runs in Azerbaijani, English and Russian. Azerbaijani is the default.

---

## Run it

```bash
npm install
npm run dev
```

That is the whole setup. **No environment variables are required** — with none
set, the site runs on demo content, marks it as demo where it appears, and
disables the parts that would write to a database. This is deliberate: a clean
clone should show you the finished thing, not a stack of configuration errors.

To connect a real backend, see **Backend setup** below.

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server on http://localhost:5173 |
| `npm run build` | Sitemap → typecheck → production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Typecheck only |
| `npm run sitemap` | Regenerate `public/sitemap.xml` |

---

## Backend setup (Supabase)

Auth, Postgres, file storage and row-level security all come from one Supabase
project, so there is no separate auth service to wire up.

### 1. Create the project

Create a project at [supabase.com](https://supabase.com), then copy
**Project Settings → API → Project URL** and **anon public key** into
`.env.local`:

```bash
cp .env.example .env.local
```

```
VITE_SUPABASE_URL=https://xxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGci...
```

The anon key belongs in the client bundle — it is public by design. Row-level
security is what protects the data. **Never** put the service-role key in any
`VITE_*` variable.

### 2. Run the migrations

In the Supabase SQL editor, run the files in `supabase/migrations/` **in order**:

| File | What it creates |
| --- | --- |
| `0001_schema.sql` | Tables, enums, the order-status trigger, the new-user trigger |
| `0002_rls.sql` | Row-level security policies |
| `0003_functions.sql` | The order lifecycle functions (quote, pay, confirm, deliver) |
| `0004_storage.sql` | The private `receipts` bucket and public `avatars` bucket |

`supabase/seed.sql` is optional demo content — useful for exercising the Owner
desk against real rows. Replace it with your own work before launch.

### 3. Make yourself the Owner

Sign in through the site once so your account exists, then run this in the SQL
editor with your own user id (find it under **Authentication → Users**):

```sql
update profiles set is_owner = true where id = 'your-uuid-here';
```

That flag is the only thing separating a buyer from the Owner desk at `/admin`.
Everything owner-only re-checks it inside the database, not just in the UI.

### 4. Turn on the sign-in providers

**Authentication → Providers**:

- **Google** — create OAuth credentials in Google Cloud Console, paste the
  client id and secret.
- **Azure** — this is the "Microsoft / Outlook" option. Register an app in the
  Azure portal, use `common` as the tenant so personal Outlook accounts work
  alongside work accounts.
- **Email** — on by default; leave "Confirm email" enabled.

For every provider, set the redirect URL to:

```
https://your-domain/auth/callback
```

…and add the same under **Authentication → URL Configuration → Redirect URLs**,
including `http://localhost:5173/auth/callback` while developing.

---

## Getting paid

There is no payment processor, by design. Money moves directly from the buyer's
bank to yours, and you confirm it by hand.

**How it works:**

1. The buyer sees the amount, your receiving details, and a unique order
   reference (`WS-XXXXXX`) they must put in the transfer description.
2. They pay from whichever banking app they already use, then upload a receipt.
3. The order becomes **Payment under review**. Nothing is delivered.
4. `/admin` → **Payments to check** shows the order, the claimed amount, the
   reference and the receipt.
5. You **Confirm** (unlocks delivery) or **Reject** with a reason the buyer can
   act on.

**The receipt is a notification, not proof.** It is a file the buyer produced
and could have edited. The verification step is you looking at your own bank
statement. The admin screen says this on every payment card, and it is worth
repeating here.

Fill in your receiving details in `.env.local`:

```
VITE_PAY_BANK_NAME=Kapital Bank
VITE_PAY_ACCOUNT_HOLDER=Your Name
VITE_PAY_CARD_NUMBER=4169738812345678
VITE_PAY_IBAN=AZ00AIIB000000000000000000
VITE_PAY_WALLETS=m10, Birbank
```

There is no variable for a CVV or expiry date, and no form field for one
anywhere in this codebase. A card number and an IBAN are all you need to
*receive* money; CVV and expiry are what you need to *spend* from a card. If
anything ever prompts you to add them, that is the moment to stop.

The platform stores no card numbers, no CVVs and no bank logins — only the
receipt file a buyer chose to upload, and your own public receiving details.

---

## Images

Claude Code cannot produce photography, so every image slot ships as a
deliberate duotone placeholder cropped to the exact final dimensions. Nothing
renders as a broken icon or a grey box.

`image-manifest.json` at the project root lists every slot:

```json
{
  "id": "hero-workspace",
  "expected_path": "/assets/images/hero/hero-workspace.jpg",
  "search_terms": "overhead desk at night, laptop with code editor, ...",
  "aspect_ratio": "16:9",
  "min_width_px": 2400,
  "alt_text": { "az": "…", "en": "…", "ru": "…" },
  "placement_note": "Sits inside the hero drafting frame on screens ≥1024px…"
}
```

**To fill a slot:** save a file at `expected_path` under `public/`. It appears
on next load. No code change, no rebuild step beyond the normal one.

`search_terms` is written to be pasted straight into a stock-photo search.
Two notes on specific slots:

- `owner-portrait` must be a real photograph of you. A stock portrait next to
  the words "one person in Baku" undoes the credibility of the whole page.
- `og-default` is the social share card. Export it from the hero at 1200×630.

Database-backed images (listing covers, case-study covers) read their path from
the row's `cover_image` column instead, and fall back to the same placeholder.

---

## Deploy

The build output is static. Both platforms are pre-configured.

### Vercel

```bash
npx vercel
```

`vercel.json` already sets the SPA rewrite, immutable caching for hashed
assets, and a basic set of security headers. Add your `VITE_*` variables under
**Project → Settings → Environment Variables** and redeploy — the sitemap
generator picks up the Supabase variables at build time and includes every
listing and case study.

### Netlify

```bash
npx netlify deploy --prod
```

Build command `npm run build`, publish directory `dist`. `public/_redirects`
handles the SPA fallback.

### After deploying

1. Set `VITE_SITE_URL` to the real domain — canonical URLs, OpenGraph tags and
   the sitemap all derive from it.
2. Add `https://your-domain/auth/callback` to the Supabase redirect list.
3. Submit `https://your-domain/sitemap.xml` to Google Search Console.

---

## How it is built

```
src/
├── config/site.ts          Brand, contact, payment details, currency, stats
├── i18n/                   Locale loader + az / en / ru translation files
├── lib/
│   ├── api.ts              Data access; falls back to demo content
│   ├── supabase.ts         Client; null when unconfigured
│   ├── images.ts           Manifest lookup + placeholder tones
│   ├── format.ts           Money, dates, localised text picking
│   └── seo.ts              Per-page, per-locale meta and hreflang
├── store/                  Zustand: auth, UI, saved listings
├── components/
│   ├── layout/             Header, footer, language switcher, page head
│   ├── ui/                 Buttons, form controls, status pills, reveal
│   ├── media/              ManagedImage
│   ├── home/               The eight landing-page sections
│   ├── portfolio/          Case study card
│   └── marketplace/        Listing row
└── pages/                  One file per route
```

**Stack:** Vite · React 19 · TypeScript · Tailwind v4 · Zustand · react-i18next
· Supabase · React Router.

### Things worth knowing before you change something

**The order lifecycle lives in Postgres, not in React.** Every transition is a
`SECURITY DEFINER` function in `0003_functions.sql` that re-checks the caller.
`orders` has no buyer `UPDATE` policy at all, which is why a buyer can create an
order and attach a receipt but cannot move one toward "paid". If you add a new
state, add it to the enum, the function, and `ORDER_MILESTONES` in
`src/types/db.ts` — not to a component.

**Status history is a trigger, not an application call.** `order_events` is
written by `log_order_status_change()`, so the buyer-facing timeline cannot
drift from the actual state.

**Reviews cannot be faked.** `submit_review()` refuses anything that is not a
completed order belonging to the caller, and there is no demo review data — the
reviews section on the landing page stays honestly empty until a real one
exists.

**Locales are code-split.** `src/i18n/index.ts` loads only the active language
before first render and warms Azerbaijani in the background as the fallback.
Adding a language means adding a loader entry, a JSON file, and an entry in
`SUPPORTED_LOCALES`.

**Design tokens are in `src/index.css`, not a Tailwind config file.** Tailwind
v4 reads the `@theme` block directly. Colours, the type scale and the motion
keyframes are all defined there once.

---

## Before you go live

- [ ] Fill in `VITE_PAY_*` — the checkout page says outright that details are
      missing until you do.
- [ ] Fill in or leave blank the `VITE_STAT_*` numbers. Blank renders as "not
      filled in yet", which is honest. An invented figure is not.
- [ ] Replace `supabase/seed.sql` demo entries with your real work.
- [ ] Add real images for at least `hero-workspace`, `owner-portrait` and
      `og-default`.
- [ ] Read `/terms`, `/privacy` and `/refund` end to end and make them true —
      they are written as real policies, not filler, and they commit you to
      specific timescales.
- [ ] Set `is_owner = true` on your account and check `/admin` loads.
- [ ] Place a test order end to end: buy → transfer 1 ₼ to yourself → upload the
      receipt → confirm it in `/admin` → check the buyer view updates.
