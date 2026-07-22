-- ============================================================================
-- Health check — run this in the Supabase SQL editor after the migrations.
--
-- Every row should read OK. Anything marked MISSING means the migration that
-- creates it did not run, or errored partway through; re-run that file.
-- Safe to run at any time: it only reads catalogue metadata.
-- ============================================================================

with expected_tables(obj) as (
  values ('profiles'), ('case_studies'), ('listings'), ('site_requests'),
         ('orders'), ('payments'), ('order_events'), ('order_messages'),
         ('reviews'), ('saved_listings')
),
expected_functions(obj) as (
  values ('is_owner'), ('touch_updated_at'), ('log_order_status_change'),
         ('handle_new_user'), ('generate_order_ref'), ('set_order_ref'),
         ('create_listing_order'), ('create_custom_order'), ('send_quote'),
         ('accept_quote'), ('decline_quote'), ('submit_payment'),
         ('confirm_payment'), ('reject_payment'), ('start_work'),
         ('deliver_order'), ('complete_order'), ('cancel_order'),
         ('submit_review')
),
expected_buckets(obj) as (
  values ('receipts'), ('avatars')
),

results as (

  -- 1. Tables
  select '1. table' as part, e.obj as name,
         case when t.tablename is null then '!! MISSING' else 'OK' end as status
  from expected_tables e
  left join pg_tables t on t.tablename = e.obj and t.schemaname = 'public'

  union all

  -- 2. Row-level security must be ON, or the policies protect nothing
  select '2. rls', e.obj,
         case
           when c.relname is null then '!! TABLE MISSING'
           when c.relrowsecurity then 'OK'
           else '!! RLS OFF'
         end
  from expected_tables e
  left join pg_class c
    on c.relname = e.obj and c.relnamespace = 'public'::regnamespace

  union all

  -- 3. Lifecycle functions
  select '3. function', e.obj,
         case when p.proname is null then '!! MISSING' else 'OK' end
  from expected_functions e
  left join pg_proc p
    on p.proname = e.obj and p.pronamespace = 'public'::regnamespace

  union all

  -- 4. Storage buckets
  select '4. bucket', e.obj,
         case
           when b.id is null then '!! MISSING'
           when e.obj = 'receipts' and b.public then '!! SHOULD BE PRIVATE'
           else 'OK'
         end
  from expected_buckets e
  left join storage.buckets b on b.id = e.obj

  union all

  -- 5. Policy count per table. RLS on with zero policies locks everyone out,
  --    which looks identical to "broken" from inside the app.
  select '5. policies', e.obj,
         case
           when count(pol.policyname) = 0 then '!! NO POLICIES'
           else 'OK (' || count(pol.policyname) || ')'
         end
  from expected_tables e
  left join pg_policies pol
    on pol.tablename = e.obj and pol.schemaname = 'public'
  group by e.obj

  union all

  -- 6. Owner account — 0 until you flip the flag on your own profile
  select '6. owner', 'profiles.is_owner',
         case
           when count(*) = 0 then 'none yet - see next step'
           else 'OK (' || count(*) || ')'
         end
  from profiles
  where is_owner
)

select part, name, status
from results
order by part, status desc, name;
