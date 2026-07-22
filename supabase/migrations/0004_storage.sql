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
