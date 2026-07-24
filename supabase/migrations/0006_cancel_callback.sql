-- ============================================================================
-- Let buyers call back an order — but only before the receipt stage
-- ----------------------------------------------------------------------------
-- Run this against an existing database (fresh installs already have it via
-- setup.sql / 0003). It replaces cancel_order so a buyer can withdraw an order
-- only while it is still in draft / quote_requested / quoted / awaiting_payment
-- / payment_rejected. Once a receipt has been submitted, cancelling becomes a
-- refund conversation rather than a self-service button. The Owner can still
-- cancel from any state.
-- ============================================================================

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
