-- ============================================================================
-- WebSale.az — schema
-- ----------------------------------------------------------------------------
-- Conventions
--   * Localised text is stored as jsonb shaped {"az": "...", "en": "...",
--     "ru": "..."}. The client falls back az -> en -> first key present, so a
--     partially-translated row still renders.
--   * Money is `numeric(10,2)` in AZN. There is exactly one currency in the
--     database; any second currency is a display conversion in the client.
--   * The order lifecycle lives in `orders.status` and every transition is
--     recorded in `order_events` by trigger, so the buyer-facing timeline is
--     derived from real state rather than assembled in the UI.
-- ============================================================================

create extension if not exists "pgcrypto";

-- --------------------------------------------------------------------------
-- Enums
-- --------------------------------------------------------------------------

create type listing_status as enum ('draft', 'published', 'sold');

create type request_status as enum (
  'new',        -- sitting in the Owner's queue
  'quoted',     -- a quote exists on the linked order
  'accepted',   -- buyer accepted; work is tracked on the order
  'declined',   -- buyer turned the quote down
  'archived'
);

create type order_kind as enum ('listing', 'custom');

create type order_status as enum (
  'draft',
  'quote_requested',   -- custom order, waiting for the Owner to price it
  'quoted',            -- price sent, waiting on the buyer
  'quote_declined',
  'awaiting_payment',  -- buyer owes money (deposit, balance, or full)
  'payment_submitted', -- receipt uploaded, Owner has not verified yet
  'paid',              -- Owner matched it against their own statement
  'in_progress',
  'delivered',
  'completed',
  'payment_rejected',
  'cancelled'
);

create type payment_kind as enum ('full', 'deposit', 'balance');

create type payment_status as enum ('submitted', 'confirmed', 'rejected');

-- --------------------------------------------------------------------------
-- profiles — one row per auth user, created by trigger on sign-up
-- --------------------------------------------------------------------------

create table profiles (
  id           uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url   text,
  phone        text,
  -- The single Owner flag. Set it by hand once, for your own account:
  --   update profiles set is_owner = true where id = '<your-uuid>';
  is_owner     boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- --------------------------------------------------------------------------
-- case_studies — portfolio entries
-- --------------------------------------------------------------------------

create table case_studies (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       jsonb not null default '{}'::jsonb,
  client      text,
  summary     jsonb not null default '{}'::jsonb,
  problem     jsonb not null default '{}'::jsonb,
  built       jsonb not null default '{}'::jsonb,
  outcome     jsonb not null default '{}'::jsonb,
  industry    text,
  stack       text[] not null default '{}',
  tags        text[] not null default '{}',
  year        integer,
  live_url    text,
  cover_image text,          -- path under /assets/images/portfolio/
  gallery     text[] not null default '{}',
  published   boolean not null default false,
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index case_studies_published_idx on case_studies (published, sort_order desc, created_at desc);

-- --------------------------------------------------------------------------
-- listings — ready-made sites for sale
-- --------------------------------------------------------------------------

create table listings (
  id          uuid primary key default gen_random_uuid(),
  slug        text unique not null,
  title       jsonb not null default '{}'::jsonb,
  tagline     jsonb not null default '{}'::jsonb,
  description jsonb not null default '{}'::jsonb,
  best_for    jsonb not null default '{}'::jsonb,
  price_azn   numeric(10,2) not null check (price_azn >= 0),
  category    text,
  page_count  integer,
  pages       text[] not null default '{}',
  stack       text[] not null default '{}',
  demo_url    text,
  cover_image text,          -- path under /assets/images/marketplace/
  screenshots text[] not null default '{}',
  -- 'single' == one business, one domain. Kept as text so the Owner can add
  -- an exclusive tier later without a migration.
  license     text not null default 'single',
  status      listing_status not null default 'draft',
  sort_order  integer not null default 0,
  created_at  timestamptz not null default now()
);

create index listings_status_idx on listings (status, sort_order desc, created_at desc);

-- --------------------------------------------------------------------------
-- site_requests — the "request a site" form
-- --------------------------------------------------------------------------

create table site_requests (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  business_name     text not null,
  business_type     text not null,
  business_desc     text,
  has_website       boolean not null default false,
  current_url       text,
  pages             text[] not null default '{}',
  features          text[] not null default '{}',
  style_refs        text,
  style_notes       text,
  has_branding      boolean not null default false,
  budget_range      text,
  timeline          text,
  contact_name      text not null,
  contact_email     text not null,
  contact_phone     text,
  contact_preferred text not null default 'email',
  status            request_status not null default 'new',
  created_at        timestamptz not null default now()
);

create index site_requests_user_idx on site_requests (user_id, created_at desc);
create index site_requests_queue_idx on site_requests (status, created_at);

-- --------------------------------------------------------------------------
-- orders — the single source of truth for both purchase paths
-- --------------------------------------------------------------------------

create table orders (
  id          uuid primary key default gen_random_uuid(),
  -- Human-quotable reference. The buyer types this into their transfer note;
  -- it is how money gets matched to an order.
  ref         text unique not null,
  user_id     uuid not null references auth.users(id) on delete restrict,
  kind        order_kind not null,
  listing_id  uuid references listings(id) on delete set null,
  request_id  uuid references site_requests(id) on delete set null,
  -- Snapshot of what was bought, so the order still reads correctly after the
  -- listing is edited, renamed or unpublished.
  title       jsonb not null default '{}'::jsonb,

  total_azn   numeric(10,2) check (total_azn >= 0),
  -- Null deposit == pay in full. When set, the buyer pays deposit first and
  -- (total - deposit) on delivery.
  deposit_azn numeric(10,2) check (deposit_azn >= 0),
  paid_azn    numeric(10,2) not null default 0 check (paid_azn >= 0),

  status      order_status not null default 'draft',

  -- Quote (custom orders only)
  quote_scope      jsonb,
  quote_note       text,
  quote_delivery   date,
  quote_expires_at date,
  quoted_at        timestamptz,
  decline_reason   text,

  -- Handover
  delivery_url   text,
  delivery_notes text,
  delivered_at   timestamptz,
  completed_at   timestamptz,

  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),

  constraint orders_deposit_within_total
    check (deposit_azn is null or total_azn is null or deposit_azn <= total_azn),
  constraint orders_listing_or_request
    check ((kind = 'listing' and listing_id is not null)
        or (kind = 'custom'  and request_id is not null))
);

create index orders_user_idx on orders (user_id, created_at desc);
create index orders_status_idx on orders (status, updated_at desc);

-- --------------------------------------------------------------------------
-- payments — one row per receipt the buyer submits
-- --------------------------------------------------------------------------

create table payments (
  id            uuid primary key default gen_random_uuid(),
  order_id      uuid not null references orders(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete restrict,
  kind          payment_kind not null default 'full',
  -- What the buyer says they sent. Never trusted: the Owner confirms against
  -- their own bank statement, and `orders.paid_azn` only moves on confirm.
  claimed_amount_azn numeric(10,2) not null check (claimed_amount_azn > 0),
  paid_at       date,
  -- Path inside the private `receipts` storage bucket.
  receipt_path  text not null,
  buyer_note    text,
  status        payment_status not null default 'submitted',
  reject_reason text,
  reject_detail text,
  reviewed_at   timestamptz,
  reviewed_by   uuid references auth.users(id) on delete set null,
  created_at    timestamptz not null default now()
);

create index payments_order_idx on payments (order_id, created_at desc);
create index payments_queue_idx on payments (status, created_at) where status = 'submitted';

-- --------------------------------------------------------------------------
-- order_events — append-only status history, written by trigger
-- --------------------------------------------------------------------------

create table order_events (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null references orders(id) on delete cascade,
  from_status order_status,
  to_status   order_status not null,
  actor_id    uuid references auth.users(id) on delete set null,
  note        text,
  created_at  timestamptz not null default now()
);

create index order_events_order_idx on order_events (order_id, created_at);

-- --------------------------------------------------------------------------
-- order_messages — buyer <-> Owner thread scoped to one order
-- --------------------------------------------------------------------------

create table order_messages (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references orders(id) on delete cascade,
  sender_id  uuid not null references auth.users(id) on delete cascade,
  body       text not null check (length(btrim(body)) > 0),
  created_at timestamptz not null default now()
);

create index order_messages_order_idx on order_messages (order_id, created_at);

-- --------------------------------------------------------------------------
-- reviews — one per completed order, and only per completed order
-- --------------------------------------------------------------------------

create table reviews (
  id          uuid primary key default gen_random_uuid(),
  order_id    uuid not null unique references orders(id) on delete cascade,
  user_id     uuid not null references auth.users(id) on delete cascade,
  -- Snapshotted so the public review list never has to read `profiles`.
  author_name text not null,
  rating      integer not null check (rating between 1 and 5),
  body        text,
  published   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index reviews_published_idx on reviews (published, created_at desc);

-- --------------------------------------------------------------------------
-- saved_listings — the bookmark on a listing card
-- --------------------------------------------------------------------------

create table saved_listings (
  user_id    uuid not null references auth.users(id) on delete cascade,
  listing_id uuid not null references listings(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, listing_id)
);

-- --------------------------------------------------------------------------
-- Triggers
-- --------------------------------------------------------------------------

-- Keep updated_at honest.
create or replace function touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger orders_touch_updated_at
  before update on orders
  for each row execute function touch_updated_at();

create trigger profiles_touch_updated_at
  before update on profiles
  for each row execute function touch_updated_at();

-- Every status change lands in order_events. Because this is a trigger rather
-- than an application call, the timeline cannot drift from the actual state.
create or replace function log_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into order_events (order_id, from_status, to_status, actor_id)
    values (new.id, null, new.status, auth.uid());
  elsif new.status is distinct from old.status then
    insert into order_events (order_id, from_status, to_status, actor_id)
    values (new.id, old.status, new.status, auth.uid());
  end if;
  return new;
end;
$$;

create trigger orders_log_status
  after insert or update of status on orders
  for each row execute function log_order_status_change();

-- Mirror new auth users into profiles, carrying whatever the OAuth provider
-- gave us (Google and Microsoft both populate name + picture).
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      split_part(new.email, '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
