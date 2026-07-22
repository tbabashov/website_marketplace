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
