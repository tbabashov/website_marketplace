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
    end,
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
