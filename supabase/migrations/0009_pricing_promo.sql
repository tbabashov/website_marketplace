-- 0009_pricing_promo.sql
--
-- Per-listing percentage discounts, and a promo-code system. A ready-made
-- order snapshots its total at creation, so both discounts must be resolved
-- inside create_listing_order — never trusted from the client.

-- 1. Per-listing discount -----------------------------------------------------
alter table listings
  add column if not exists discount_percent int not null default 0
    check (discount_percent between 0 and 90);

-- 2. Record what an order actually saved --------------------------------------
alter table orders add column if not exists promo_code  text;
alter table orders add column if not exists discount_azn numeric(10,2) not null default 0;

-- 3. Promo codes --------------------------------------------------------------
create table if not exists promo_codes (
  code        text primary key,          -- stored & compared upper-case
  percent_off int  not null check (percent_off between 1 and 100),
  active      boolean not null default true,
  expires_at  timestamptz,               -- null = never expires
  max_uses    int,                        -- null = unlimited
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

-- Read-only preview for the buyer typing a code on the listing page. Security
-- definer so it can see the row past RLS, but it only ever returns the code and
-- its percentage — never usage or limits — and never mutates.
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

-- 4. Order creation now resolves both discounts -------------------------------
-- Adding a parameter changes the signature, so drop the old one first.
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
  v_base    numeric(10,2);   -- after the listing's own discount
  v_final   numeric(10,2);   -- after the promo, too
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

  -- Consume the promo atomically. If the buyer passed a code that is no longer
  -- valid, fail loudly rather than quietly charging them the higher price they
  -- did not see.
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

-- 5. Seed the launch code -----------------------------------------------------
insert into promo_codes (code, percent_off, note)
values ('DISCOUNTSZN', 7, 'Launch code — extra 7% off any ready-made site')
on conflict (code) do nothing;
