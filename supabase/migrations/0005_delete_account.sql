-- ============================================================================
-- Account deletion
-- ----------------------------------------------------------------------------
-- Deleting an account cannot always mean deleting the row, and the privacy
-- policy already says so: completed orders and their receipts are kept for as
-- long as accounting law requires. `orders.user_id` is ON DELETE RESTRICT for
-- exactly that reason.
--
-- So there are two honest outcomes, and the function reports which one
-- happened rather than claiming the same thing in both cases:
--
--   no orders    -> the auth user is deleted outright, cascading to the
--                   profile and saved listings. Nothing is left.
--
--   has orders   -> the order rows stay, because they are accounting records.
--                   Everything personal is stripped (name, photo, phone, the
--                   name on any review) and the login is closed permanently,
--                   so the account cannot be used again.
--
-- Doing this from the browser is impossible without the service-role key,
-- which must never reach a client bundle. Hence a SECURITY DEFINER function
-- that only ever acts on the caller's own id.
-- ============================================================================

create or replace function public.delete_my_account()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid    uuid := auth.uid();
  v_orders integer;
begin
  if v_uid is null then
    raise exception 'Sign in first' using errcode = '42501';
  end if;

  -- The Owner deleting their own account would leave the admin desk with no
  -- one behind it and orders with no one to confirm them.
  if public.is_owner() then
    raise exception 'The owner account cannot be deleted from here'
      using errcode = '42501';
  end if;

  select count(*) into v_orders from orders where user_id = v_uid;

  -- Personal data goes in both branches. Saved listings are a preference, not
  -- a record, so they always go.
  delete from saved_listings where user_id = v_uid;

  -- Drop the avatar object row; Supabase reaps the underlying file. Receipts
  -- are deliberately untouched — they belong to the order, not the profile.
  delete from storage.objects
  where bucket_id = 'avatars'
    and (storage.foldername(name))[1] = v_uid::text;

  if v_orders = 0 then
    -- Cascades to profiles. Nothing of this person remains.
    delete from auth.users where id = v_uid;
    return jsonb_build_object('deleted', true, 'orders_kept', 0);
  end if;

  -- Reviews are public, so the display name has to go even though the review
  -- itself stays attached to a completed order.
  update reviews
     set author_name = 'Silinmiş istifadəçi'
   where user_id = v_uid;

  update profiles
     set display_name = null,
         avatar_url   = null,
         phone        = null
   where id = v_uid;

  -- Close the login for good. Rewriting the email frees the address for
  -- re-registration and makes the row unusable as a sign-in identity; the
  -- ban is what actually stops authentication.
  update auth.users
     set banned_until        = 'infinity'::timestamptz,
         email               = 'deleted+' || v_uid::text || '@websale.invalid',
         phone               = null,
         raw_user_meta_data  = '{}'::jsonb
   where id = v_uid;

  return jsonb_build_object('deleted', false, 'orders_kept', v_orders);
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
