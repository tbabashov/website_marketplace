-- 0007_fix_deliver_and_listing_delete.sql
--
-- Two production bugs surfaced from the owner console:
--
--   1. Declaring an order delivered raised
--        column "status" is of type order_status but expression is of type text
--      A bare literal (status = 'delivered') is an `unknown` literal that
--      Postgres coerces into the enum, but a CASE with two string branches
--      resolves to a concrete `text`, and there is no implicit text->enum
--      cast. Cast the CASE result explicitly.
--
--   2. Deleting a listing raised
--        new row for relation "orders" violates check constraint
--        "orders_listing_or_request"
--      orders.listing_id is `on delete set null`, so deleting a listing nulls
--      the column on every order that bought it — by design, since each order
--      snapshots its title/price and must outlive the listing. But the old
--      check demanded a non-null listing_id for listing-kind orders, so the
--      SET NULL was rejected and the delete failed. Relax the check to enforce
--      only mutual exclusivity of the two paths; create_order still supplies
--      listing_id at insert time, so new orders remain well-formed.

-- 1 --------------------------------------------------------------------------
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

-- 2 --------------------------------------------------------------------------
alter table orders drop constraint if exists orders_listing_or_request;
alter table orders add constraint orders_listing_or_request
  check ((kind = 'listing' and request_id is null)
      or (kind = 'custom'  and listing_id is null));
