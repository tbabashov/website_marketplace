-- 0011_promo_uses_on_payment.sql
--
-- Bug: create_listing_order (0009) incremented promo_codes.uses the moment an
-- order was CREATED, before any money changed hands. Since a fresh order sits
-- in 'awaiting_payment' — one of the buyer's own CANCELLABLE_STATES — anyone
-- could apply a promo, create an order, call it back, and repeat: each loop
-- burns one use with zero real sales, silently draining a max_uses-limited
-- code without a single payment.
--
-- Fix: order creation only *validates* the code (still checks active/expiry/
-- max_uses, so an exhausted or expired code is still rejected up front) and
-- records it on the order; the actual `uses` counter now increments in
-- confirm_payment, guarded so it only fires once per order even though a
-- deposit + balance order calls confirm_payment twice.

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

  -- Validate only — does NOT consume a use. The order simply remembers which
  -- code it priced against; confirm_payment is what counts it as used.
  if v_code is not null then
    select percent_off into v_pct
    from promo_codes
    where upper(code) = upper(v_code)
      and active
      and (expires_at is null or expires_at > now())
      and (max_uses is null or uses < max_uses);

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

  v_amount := coalesce(p_actual_amount, v_payment.claimed_amount_azn);

  update payments set
    status = 'confirmed', reviewed_at = now(), reviewed_by = auth.uid(),
    reject_reason = null, reject_detail = null
  where id = p_payment_id;

  select * into v_order from orders where id = v_payment.order_id;

  -- The first confirmed payment on this order is real money changing hands —
  -- that is when a promo code actually earns its "use". paid_azn is still the
  -- pre-update value here, so 0 means nothing has been confirmed before now;
  -- a deposit-then-balance order therefore only counts once, on the deposit.
  -- The price was already fixed at order creation, so a code that has since
  -- been deactivated or expired still counts — the buyer already got the
  -- price it promised.
  if v_order.paid_azn = 0 and v_order.promo_code is not null then
    update promo_codes set uses = uses + 1 where upper(code) = upper(v_order.promo_code);
  end if;

  if v_order.paid_azn + v_amount >= coalesce(v_order.total_azn, 0) then
    v_next := case
                when v_order.kind = 'listing' then 'delivered'
                when v_order.delivered_at is not null then 'delivered'
                else 'in_progress'
              end;
  else
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

grant execute on function
  public.confirm_payment(uuid, numeric)
to authenticated;
