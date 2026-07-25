-- 0010_onboarding.sql
--
-- First-sign-in survey answers, stored on the profile. The buyer updates their
-- own row (the existing "profiles: update own" policy already allows it), so no
-- new RLS is needed. onboarded_at doubles as the "already shown" flag: it is
-- set whether the survey is completed or skipped, so the modal never returns.

alter table profiles add column if not exists heard_from    text;
alter table profiles add column if not exists looking_for   text;
alter table profiles add column if not exists business_type text;
alter table profiles add column if not exists onboarded_at  timestamptz;
