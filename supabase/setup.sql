-- ============================================================================
-- WebSale.az — COMPLETE SETUP, in one run.
--
-- This replaces running 0001-0004 separately. It is idempotent: it drops any
-- half-built objects first, so it is safe to run again if it fails partway.
--
-- WARNING: the drops below delete all application data. That is fine on a
-- fresh project, and fine while testing. Once you have real orders in here,
-- do NOT run this file again — use the individual migrations instead.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Clean slate
-- ---------------------------------------------------------------------------

drop trigger if exists on_auth_user_created on auth.users;

drop policy if exists "receipts: upload own"      on storage.objects;
drop policy if exists "receipts: read own or owner" on storage.objects;
drop policy if exists "receipts: replace own"     on storage.objects;
drop policy if exists "avatars: public read"      on storage.objects;
drop policy if exists "avatars: write own"        on storage.objects;
drop policy if exists "avatars: update own"       on storage.objects;
drop policy if exists "avatars: delete own"       on storage.objects;

drop table if exists
  saved_listings, reviews, order_messages, order_events,
  payments, orders, site_requests, listings, case_studies, profiles
cascade;

drop type if exists
  order_status, order_kind, payment_kind, payment_status,
  request_status, listing_status
cascade;

drop function if exists public.is_owner                cascade;
drop function if exists public.touch_updated_at        cascade;
drop function if exists public.log_order_status_change cascade;
drop function if exists public.handle_new_user         cascade;
drop function if exists public.generate_order_ref      cascade;
drop function if exists public.set_order_ref           cascade;
drop function if exists public.create_listing_order    cascade;
drop function if exists public.create_custom_order     cascade;
drop function if exists public.send_quote              cascade;
drop function if exists public.accept_quote            cascade;
drop function if exists public.decline_quote           cascade;
drop function if exists public.submit_payment          cascade;
drop function if exists public.confirm_payment         cascade;
drop function if exists public.reject_payment          cascade;
drop function if exists public.start_work              cascade;
drop function if exists public.deliver_order           cascade;
drop function if exists public.complete_order          cascade;
drop function if exists public.cancel_order            cascade;
drop function if exists public.submit_review           cascade;



-- ###########################################################################
-- ## 0001_schema.sql
-- ###########################################################################

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
  -- Mutual exclusivity only: a listing order carries no request and a custom
  -- order carries no listing. listing_id/request_id are `on delete set null`
  -- so an order survives its listing/request being deleted (it snapshots its
  -- own title/price); create_order supplies the id at insert time.
  constraint orders_listing_or_request
    check ((kind = 'listing' and request_id is null)
        or (kind = 'custom'  and listing_id is null))
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


-- ###########################################################################
-- ## 0002_rls.sql
-- ###########################################################################

-- ============================================================================
-- Row-level security
-- ----------------------------------------------------------------------------
-- The rule that shapes everything below: a buyer may create an order and add a
-- receipt to it, but may never move it toward "paid" or "delivered". Those
-- transitions are Owner-only and go through the SECURITY DEFINER functions in
-- 0003_functions.sql. That is why `orders` has no buyer UPDATE policy at all.
-- ============================================================================

-- Owner check, isolated in a SECURITY DEFINER function so that policies on
-- `profiles` never have to read `profiles` (which would recurse).
create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(
    (select p.is_owner from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

grant execute on function public.is_owner() to authenticated, anon;

alter table profiles       enable row level security;
alter table case_studies   enable row level security;
alter table listings       enable row level security;
alter table site_requests  enable row level security;
alter table orders         enable row level security;
alter table payments       enable row level security;
alter table order_events   enable row level security;
alter table order_messages enable row level security;
alter table reviews        enable row level security;
alter table saved_listings enable row level security;

-- --------------------------------------------------------------------------
-- profiles
-- --------------------------------------------------------------------------

create policy "profiles: read own"
  on profiles for select
  using (id = auth.uid() or public.is_owner());

create policy "profiles: update own"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- Insert is normally done by the on_auth_user_created trigger; this covers
-- the case where a profile row is missing and the client backfills it.
create policy "profiles: insert own"
  on profiles for insert
  with check (id = auth.uid());

-- --------------------------------------------------------------------------
-- case_studies / listings — published rows are world-readable, including to
-- signed-out visitors, because the portfolio is the marketing.
-- --------------------------------------------------------------------------

create policy "case_studies: read published"
  on case_studies for select
  using (published or public.is_owner());

create policy "case_studies: owner writes"
  on case_studies for all
  using (public.is_owner())
  with check (public.is_owner());

create policy "listings: read published"
  on listings for select
  using (status in ('published', 'sold') or public.is_owner());

create policy "listings: owner writes"
  on listings for all
  using (public.is_owner())
  with check (public.is_owner());

-- --------------------------------------------------------------------------
-- site_requests
-- --------------------------------------------------------------------------

create policy "site_requests: read own"
  on site_requests for select
  using (user_id = auth.uid() or public.is_owner());

create policy "site_requests: create own"
  on site_requests for insert
  with check (user_id = auth.uid());

create policy "site_requests: owner updates"
  on site_requests for update
  using (public.is_owner())
  with check (public.is_owner());

-- --------------------------------------------------------------------------
-- orders — read own, create own, and that is all. No buyer UPDATE policy:
-- every forward transition is an RPC that checks who is calling it.
-- --------------------------------------------------------------------------

create policy "orders: read own"
  on orders for select
  using (user_id = auth.uid() or public.is_owner());

create policy "orders: create own"
  on orders for insert
  with check (
    user_id = auth.uid()
    -- A buyer may only open an order in a state that owes the Owner an
    -- action; they cannot self-serve into 'paid'.
    and status in ('draft', 'quote_requested', 'awaiting_payment')
  );

create policy "orders: owner updates"
  on orders for update
  using (public.is_owner())
  with check (public.is_owner());

-- --------------------------------------------------------------------------
-- payments — the buyer may attach a receipt; only the Owner may judge it.
-- --------------------------------------------------------------------------

create policy "payments: read own"
  on payments for select
  using (user_id = auth.uid() or public.is_owner());

create policy "payments: submit own"
  on payments for insert
  with check (
    user_id = auth.uid()
    and status = 'submitted'
    and exists (
      select 1 from orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

create policy "payments: owner reviews"
  on payments for update
  using (public.is_owner())
  with check (public.is_owner());

-- --------------------------------------------------------------------------
-- order_events — readable with the order, written only by trigger
-- --------------------------------------------------------------------------

create policy "order_events: read with order"
  on order_events for select
  using (
    public.is_owner()
    or exists (
      select 1 from orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

-- --------------------------------------------------------------------------
-- order_messages
-- --------------------------------------------------------------------------

create policy "order_messages: read with order"
  on order_messages for select
  using (
    public.is_owner()
    or exists (
      select 1 from orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );

create policy "order_messages: send on own order"
  on order_messages for insert
  with check (
    sender_id = auth.uid()
    and (
      public.is_owner()
      or exists (
        select 1 from orders o
        where o.id = order_id and o.user_id = auth.uid()
      )
    )
  );

-- --------------------------------------------------------------------------
-- reviews — public read; writes only via submit_review(), which enforces that
-- the order exists, belongs to the caller, and is completed.
-- --------------------------------------------------------------------------

create policy "reviews: read published"
  on reviews for select
  using (published or user_id = auth.uid() or public.is_owner());

create policy "reviews: edit own"
  on reviews for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "reviews: owner moderates"
  on reviews for all
  using (public.is_owner())
  with check (public.is_owner());

-- --------------------------------------------------------------------------
-- saved_listings
-- --------------------------------------------------------------------------

create policy "saved_listings: own rows"
  on saved_listings for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());


-- ###########################################################################
-- ## 0003_functions.sql
-- ###########################################################################

-- ============================================================================
-- Order lifecycle
-- ----------------------------------------------------------------------------
-- Each transition is a function rather than a client-side UPDATE, so the rules
-- ("only the Owner marks money received", "only a completed order can be
-- reviewed") live next to the data instead of in the UI.
--
-- Every function is SECURITY DEFINER and therefore re-checks the caller itself.
-- ============================================================================

-- --------------------------------------------------------------------------
-- Order references: WS-XXXXXX, from an alphabet with no 0/O/1/I so that a
-- reference read aloud over the phone or retyped into a transfer note does
-- not come back wrong.
-- --------------------------------------------------------------------------

create or replace function public.generate_order_ref()
returns text
language plpgsql
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
  candidate text;
  i integer;
begin
  loop
    candidate := 'WS-';
    for i in 1..6 loop
      candidate := candidate || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;
    exit when not exists (select 1 from orders where ref = candidate);
  end loop;
  return candidate;
end;
$$;

create or replace function public.set_order_ref()
returns trigger
language plpgsql
as $$
begin
  if new.ref is null or btrim(new.ref) = '' then
    new.ref := public.generate_order_ref();
  end if;
  return new;
end;
$$;

-- BEFORE ROW triggers run ahead of constraint checking, so `orders.ref` can
-- stay NOT NULL while callers omit it entirely.
create trigger orders_set_ref
  before insert on orders
  for each row execute function public.set_order_ref();

-- --------------------------------------------------------------------------
-- Buyer: start an order for a ready-made listing
-- --------------------------------------------------------------------------

create or replace function public.create_listing_order(
  p_listing_id uuid,
  p_use_deposit boolean default false,
  p_deposit_percent integer default 40
)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing listings;
  v_order   orders;
  v_deposit numeric(10,2);
begin
  if auth.uid() is null then
    raise exception 'Sign in to place an order' using errcode = '42501';
  end if;

  select * into v_listing from listings where id = p_listing_id;

  if v_listing.id is null or v_listing.status <> 'published' then
    raise exception 'That listing is not available' using errcode = 'P0002';
  end if;

  if p_use_deposit and p_deposit_percent between 1 and 99 then
    v_deposit := round(v_listing.price_azn * p_deposit_percent / 100.0, 2);
  else
    v_deposit := null;
  end if;

  insert into orders (user_id, kind, listing_id, title, total_azn, deposit_azn, status)
  values (
    auth.uid(), 'listing', v_listing.id, v_listing.title,
    v_listing.price_azn, v_deposit, 'awaiting_payment'
  )
  returning * into v_order;

  return v_order;
end;
$$;

-- --------------------------------------------------------------------------
-- Buyer: submit a site request, and open the custom order that tracks it
-- --------------------------------------------------------------------------

create or replace function public.create_custom_order(p_request_id uuid)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_request site_requests;
  v_order   orders;
begin
  select * into v_request from site_requests where id = p_request_id;

  if v_request.id is null or v_request.user_id <> auth.uid() then
    raise exception 'Request not found' using errcode = 'P0002';
  end if;

  -- One order per request; re-submitting returns the existing one.
  select * into v_order from orders where request_id = p_request_id limit 1;
  if v_order.id is not null then
    return v_order;
  end if;

  insert into orders (user_id, kind, request_id, title, status)
  values (
    auth.uid(), 'custom', v_request.id,
    jsonb_build_object('az', v_request.business_name, 'en', v_request.business_name, 'ru', v_request.business_name),
    'quote_requested'
  )
  returning * into v_order;

  return v_order;
end;
$$;

-- --------------------------------------------------------------------------
-- Owner: price a custom order
-- --------------------------------------------------------------------------

create or replace function public.send_quote(
  p_order_id   uuid,
  p_total      numeric,
  p_deposit    numeric default null,
  p_scope      jsonb   default null,
  p_note       text    default null,
  p_delivery   date    default null,
  p_valid_days integer default 14
)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders;
begin
  if not public.is_owner() then
    raise exception 'Only the site owner can send a quote' using errcode = '42501';
  end if;

  if p_total is null or p_total <= 0 then
    raise exception 'A quote needs a price' using errcode = '22023';
  end if;

  if p_deposit is not null and (p_deposit < 0 or p_deposit > p_total) then
    raise exception 'The deposit cannot be more than the total' using errcode = '22023';
  end if;

  update orders set
    total_azn        = p_total,
    deposit_azn      = p_deposit,
    quote_scope      = p_scope,
    quote_note       = p_note,
    quote_delivery   = p_delivery,
    quote_expires_at = (current_date + make_interval(days => greatest(p_valid_days, 1)))::date,
    quoted_at        = now(),
    decline_reason   = null,
    status           = 'quoted'
  where id = p_order_id
  returning * into v_order;

  if v_order.id is null then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  update site_requests set status = 'quoted' where id = v_order.request_id;

  return v_order;
end;
$$;

-- --------------------------------------------------------------------------
-- Buyer: accept or decline a quote
-- --------------------------------------------------------------------------

create or replace function public.accept_quote(p_order_id uuid)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders;
begin
  select * into v_order from orders where id = p_order_id;

  if v_order.id is null or v_order.user_id <> auth.uid() then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.status <> 'quoted' then
    raise exception 'There is no open quote on this order' using errcode = '22023';
  end if;

  update orders set status = 'awaiting_payment'
  where id = p_order_id
  returning * into v_order;

  update site_requests set status = 'accepted' where id = v_order.request_id;

  return v_order;
end;
$$;

create or replace function public.decline_quote(p_order_id uuid, p_reason text default null)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders;
begin
  select * into v_order from orders where id = p_order_id;

  if v_order.id is null or v_order.user_id <> auth.uid() then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.status <> 'quoted' then
    raise exception 'There is no open quote on this order' using errcode = '22023';
  end if;

  update orders set status = 'quote_declined', decline_reason = p_reason
  where id = p_order_id
  returning * into v_order;

  update site_requests set status = 'declined' where id = v_order.request_id;

  return v_order;
end;
$$;

-- --------------------------------------------------------------------------
-- Buyer: attach a receipt
-- --------------------------------------------------------------------------

create or replace function public.submit_payment(
  p_order_id     uuid,
  p_kind         payment_kind,
  p_amount       numeric,
  p_receipt_path text,
  p_paid_at      date default null,
  p_note         text default null
)
returns payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order   orders;
  v_payment payments;
begin
  select * into v_order from orders where id = p_order_id;

  if v_order.id is null or v_order.user_id <> auth.uid() then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.status not in ('awaiting_payment', 'payment_rejected', 'delivered', 'in_progress') then
    raise exception 'This order is not waiting for a payment' using errcode = '22023';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Enter the amount you transferred' using errcode = '22023';
  end if;

  insert into payments (order_id, user_id, kind, claimed_amount_azn, paid_at, receipt_path, buyer_note)
  values (p_order_id, auth.uid(), p_kind, p_amount, p_paid_at, p_receipt_path, p_note)
  returning * into v_payment;

  update orders set status = 'payment_submitted' where id = p_order_id;

  return v_payment;
end;
$$;

-- --------------------------------------------------------------------------
-- Owner: confirm or reject a receipt
--
-- Confirming is the only thing that moves money in this system, and it is
-- deliberately a human decision made against a bank statement — the receipt
-- file is a notification, not evidence.
-- --------------------------------------------------------------------------

create or replace function public.confirm_payment(
  p_payment_id uuid,
  p_actual_amount numeric default null
)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments;
  v_order   orders;
  v_amount  numeric(10,2);
  v_next    order_status;
begin
  if not public.is_owner() then
    raise exception 'Only the site owner can confirm a payment' using errcode = '42501';
  end if;

  select * into v_payment from payments where id = p_payment_id;
  if v_payment.id is null then
    raise exception 'Payment not found' using errcode = 'P0002';
  end if;
  if v_payment.status <> 'submitted' then
    raise exception 'This payment has already been reviewed' using errcode = '22023';
  end if;

  -- Trust the Owner's figure over the buyer's claim when they differ.
  v_amount := coalesce(p_actual_amount, v_payment.claimed_amount_azn);

  update payments set
    status = 'confirmed', reviewed_at = now(), reviewed_by = auth.uid(),
    reject_reason = null, reject_detail = null
  where id = p_payment_id;

  select * into v_order from orders where id = v_payment.order_id;

  -- Delivery is what the money unlocks:
  --   a ready-made site is handed over as soon as it is paid in full;
  --   a custom build starts on the deposit and completes on the balance.
  --
  -- `delivered_at` rather than `status` is what says "already handed over":
  -- by the time this runs, submit_payment has moved the order to
  -- 'payment_submitted', so the previous status is gone. Reading it here was
  -- a bug that sent a delivered custom build back to 'in_progress' when the
  -- buyer paid the final balance.
  if v_order.paid_azn + v_amount >= coalesce(v_order.total_azn, 0) then
    v_next := case
                when v_order.kind = 'listing' then 'delivered'
                when v_order.delivered_at is not null then 'delivered'
                else 'in_progress'
              end;
  else
    -- Part-paid. A custom build can start; a ready-made site has nothing to
    -- build, so the honest state is that a balance is still owed.
    v_next := case when v_order.kind = 'custom' then 'in_progress' else 'awaiting_payment' end;
  end if;

  update orders set
    paid_azn = paid_azn + v_amount,
    status = v_next,
    delivered_at = case when v_next = 'delivered' then coalesce(delivered_at, now()) else delivered_at end
  where id = v_order.id
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.reject_payment(
  p_payment_id uuid,
  p_reason     text,
  p_detail     text default null
)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments;
  v_order   orders;
begin
  if not public.is_owner() then
    raise exception 'Only the site owner can reject a payment' using errcode = '42501';
  end if;

  select * into v_payment from payments where id = p_payment_id;
  if v_payment.id is null or v_payment.status <> 'submitted' then
    raise exception 'Payment not found, or already reviewed' using errcode = 'P0002';
  end if;

  update payments set
    status = 'rejected', reviewed_at = now(), reviewed_by = auth.uid(),
    reject_reason = p_reason, reject_detail = p_detail
  where id = p_payment_id;

  update orders set status = 'payment_rejected'
  where id = v_payment.order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- --------------------------------------------------------------------------
-- Owner: production transitions
-- --------------------------------------------------------------------------

create or replace function public.start_work(p_order_id uuid)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders;
begin
  if not public.is_owner() then
    raise exception 'Only the site owner can start work' using errcode = '42501';
  end if;

  update orders set status = 'in_progress'
  where id = p_order_id and status in ('paid', 'awaiting_payment')
  returning * into v_order;

  if v_order.id is null then
    raise exception 'Order not found, or not ready to start' using errcode = 'P0002';
  end if;

  return v_order;
end;
$$;

create or replace function public.deliver_order(
  p_order_id uuid,
  p_url      text default null,
  p_notes    text default null
)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders;
begin
  if not public.is_owner() then
    raise exception 'Only the site owner can deliver an order' using errcode = '42501';
  end if;

  update orders set
    status = case
      -- A balance still outstanding means handover waits on the last payment.
      when paid_azn < coalesce(total_azn, 0) then 'awaiting_payment'
      else 'delivered'
    end::order_status,
    delivery_url = coalesce(p_url, delivery_url),
    delivery_notes = coalesce(p_notes, delivery_notes),
    delivered_at = now()
  where id = p_order_id
  returning * into v_order;

  if v_order.id is null then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  return v_order;
end;
$$;

-- --------------------------------------------------------------------------
-- Buyer: close the order out
-- --------------------------------------------------------------------------

create or replace function public.complete_order(p_order_id uuid)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders;
begin
  select * into v_order from orders where id = p_order_id;

  if v_order.id is null or (v_order.user_id <> auth.uid() and not public.is_owner()) then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.status <> 'delivered' then
    raise exception 'This order has not been delivered yet' using errcode = '22023';
  end if;

  update orders set status = 'completed', completed_at = now()
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

create or replace function public.cancel_order(p_order_id uuid, p_reason text default null)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order orders;
begin
  select * into v_order from orders where id = p_order_id;

  if v_order.id is null or (v_order.user_id <> auth.uid() and not public.is_owner()) then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  -- A buyer may call an order back only before it reaches the receipt stage.
  -- Once a receipt has been submitted (payment_submitted) or money confirmed,
  -- cancelling is a refund conversation, not a button. The Owner can still
  -- cancel from any state.
  if not public.is_owner()
     and v_order.status not in (
       'draft', 'quote_requested', 'quoted', 'awaiting_payment', 'payment_rejected'
     ) then
    raise exception 'This order can no longer be called back' using errcode = '42501';
  end if;

  update orders set status = 'cancelled', decline_reason = coalesce(p_reason, decline_reason)
  where id = p_order_id
  returning * into v_order;

  return v_order;
end;
$$;

-- --------------------------------------------------------------------------
-- Reviews — only from someone who finished and paid for an order
-- --------------------------------------------------------------------------

create or replace function public.submit_review(
  p_order_id uuid,
  p_rating   integer,
  p_body     text default null
)
returns reviews
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order  orders;
  v_name   text;
  v_review reviews;
begin
  select * into v_order from orders where id = p_order_id;

  if v_order.id is null or v_order.user_id <> auth.uid() then
    raise exception 'Order not found' using errcode = 'P0002';
  end if;

  if v_order.status <> 'completed' then
    raise exception 'You can review an order once it is completed' using errcode = '22023';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Pick a rating from 1 to 5' using errcode = '22023';
  end if;

  select coalesce(display_name, 'Client') into v_name from profiles where id = auth.uid();

  insert into reviews (order_id, user_id, author_name, rating, body)
  values (p_order_id, auth.uid(), v_name, p_rating, nullif(btrim(p_body), ''))
  on conflict (order_id) do update
    set rating = excluded.rating,
        body = excluded.body,
        created_at = now()
  returning * into v_review;

  return v_review;
end;
$$;

-- --------------------------------------------------------------------------
-- Grants — anon gets nothing that writes.
-- --------------------------------------------------------------------------

grant execute on function
  public.create_listing_order(uuid, boolean, integer),
  public.create_custom_order(uuid),
  public.accept_quote(uuid),
  public.decline_quote(uuid, text),
  public.submit_payment(uuid, payment_kind, numeric, text, date, text),
  public.complete_order(uuid),
  public.cancel_order(uuid, text),
  public.submit_review(uuid, integer, text)
to authenticated;

grant execute on function
  public.send_quote(uuid, numeric, numeric, jsonb, text, date, integer),
  public.confirm_payment(uuid, numeric),
  public.reject_payment(uuid, text, text),
  public.start_work(uuid),
  public.deliver_order(uuid, text, text)
to authenticated;


-- ###########################################################################
-- ## 0004_storage.sql
-- ###########################################################################

-- ============================================================================
-- Storage buckets
-- ----------------------------------------------------------------------------
-- `receipts` is private. A receipt is a bank document; it is readable only by
-- the person who uploaded it and by the Owner, and only ever through a signed
-- URL with a short expiry.
--
-- `avatars` is public, because it is a profile picture shown next to a review.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('receipts', 'receipts', false, 8388608,
   array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']),
  ('avatars', 'avatars', true, 2097152,
   array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
  set file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- --------------------------------------------------------------------------
-- receipts — objects are stored at `<user-id>/<order-ref>/<filename>`, so the
-- first path segment is the check.
-- --------------------------------------------------------------------------

create policy "receipts: upload own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "receipts: read own or owner"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'receipts'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_owner())
  );

-- Re-uploading after a rejection replaces the file rather than piling up.
create policy "receipts: replace own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- --------------------------------------------------------------------------
-- avatars
-- --------------------------------------------------------------------------

create policy "avatars: public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars: write own"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: update own"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars: delete own"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- --------------------------------------------------------------------------
-- Keep snapshotted review author names in sync with profile renames.
-- --------------------------------------------------------------------------

create or replace function public.sync_review_author_name()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update reviews
    set author_name = coalesce(new.display_name, 'Client')
    where user_id = new.id;
  return new;
end;
$$;

drop trigger if exists profiles_sync_review_name on profiles;
create trigger profiles_sync_review_name
  after update of display_name on profiles
  for each row
  when (new.display_name is distinct from old.display_name)
  execute function public.sync_review_author_name();

-- ###########################################################################
-- ## 0009_pricing_promo.sql
-- ###########################################################################

alter table listings
  add column if not exists discount_percent int not null default 0
    check (discount_percent between 0 and 90);

alter table orders add column if not exists promo_code  text;
alter table orders add column if not exists discount_azn numeric(10,2) not null default 0;

create table if not exists promo_codes (
  code        text primary key,
  percent_off int  not null check (percent_off between 1 and 100),
  active      boolean not null default true,
  expires_at  timestamptz,
  max_uses    int,
  uses        int  not null default 0,
  note        text,
  created_at  timestamptz not null default now()
);

alter table promo_codes enable row level security;

drop policy if exists "promo: owner manages" on promo_codes;
create policy "promo: owner manages"
  on promo_codes for all
  using (public.is_owner())
  with check (public.is_owner());

create or replace function public.validate_promo(p_code text)
returns table (code text, percent_off int)
language sql
stable
security definer
set search_path = public
as $$
  select pc.code, pc.percent_off
  from promo_codes pc
  where upper(pc.code) = upper(btrim(p_code))
    and pc.active
    and (pc.expires_at is null or pc.expires_at > now())
    and (pc.max_uses is null or pc.uses < pc.max_uses);
$$;

grant execute on function public.validate_promo(text) to anon, authenticated;

drop function if exists public.create_listing_order(uuid, boolean, integer);

create or replace function public.create_listing_order(
  p_listing_id     uuid,
  p_use_deposit    boolean default false,
  p_deposit_percent integer default 40,
  p_promo_code     text default null
)
returns orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_listing listings;
  v_order   orders;
  v_base    numeric(10,2);
  v_final   numeric(10,2);
  v_deposit numeric(10,2);
  v_code    text := nullif(btrim(coalesce(p_promo_code, '')), '');
  v_pct     int;
begin
  if auth.uid() is null then
    raise exception 'Sign in to place an order' using errcode = '42501';
  end if;

  select * into v_listing from listings where id = p_listing_id;

  if v_listing.id is null or v_listing.status <> 'published' then
    raise exception 'That listing is not available' using errcode = 'P0002';
  end if;

  v_base  := round(v_listing.price_azn * (1 - coalesce(v_listing.discount_percent, 0) / 100.0), 2);
  v_final := v_base;

  if v_code is not null then
    update promo_codes
       set uses = uses + 1
     where upper(code) = upper(v_code)
       and active
       and (expires_at is null or expires_at > now())
       and (max_uses is null or uses < max_uses)
    returning percent_off into v_pct;

    if v_pct is null then
      raise exception 'That promo code is not valid' using errcode = '22023';
    end if;

    v_final := round(v_base * (1 - v_pct / 100.0), 2);
  end if;

  if p_use_deposit and p_deposit_percent between 1 and 99 then
    v_deposit := round(v_final * p_deposit_percent / 100.0, 2);
  else
    v_deposit := null;
  end if;

  insert into orders (
    user_id, kind, listing_id, title, total_azn, deposit_azn, status,
    promo_code, discount_azn
  )
  values (
    auth.uid(), 'listing', v_listing.id, v_listing.title,
    v_final, v_deposit, 'awaiting_payment',
    case when v_pct is not null then upper(v_code) else null end,
    v_listing.price_azn - v_final
  )
  returning * into v_order;

  return v_order;
end;
$$;

grant execute on function
  public.create_listing_order(uuid, boolean, integer, text)
to authenticated;

insert into promo_codes (code, percent_off, note)
values ('DISCOUNTSZN', 7, 'Launch code — extra 7% off any ready-made site')
on conflict (code) do nothing;

-- ###########################################################################
-- ## 0010_onboarding.sql
-- ###########################################################################

alter table profiles add column if not exists heard_from    text;
alter table profiles add column if not exists looking_for   text;
alter table profiles add column if not exists business_type text;
alter table profiles add column if not exists onboarded_at  timestamptz;
