-- 0008_sync_review_author_name.sql
--
-- reviews.author_name is snapshotted at submit time so the public review list
-- never has to read `profiles`. The side effect was that renaming yourself in
-- the profile left your old name frozen on any review you had already left.
--
-- Keep the snapshot (and its read-time benefit) but keep it in sync: whenever a
-- profile's display_name changes, propagate the new value to that user's
-- reviews. security definer so the rename — done by the user against their own
-- profile row — can write the reviews rows regardless of the reviews RLS.

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

-- One-time backfill: correct any review whose snapshot has already drifted from
-- the current profile name (renames that happened before this trigger existed).
update reviews r
   set author_name = coalesce(p.display_name, 'Client')
  from profiles p
 where p.id = r.user_id
   and r.author_name is distinct from coalesce(p.display_name, 'Client');
