-- Cadence sync schema for Supabase.
-- Paste the whole file into the Supabase SQL Editor and press Run.
-- Safe to run more than once: every statement is idempotent.

-- One row per user: the whole Cadence document.
-- updated_at is the time of the last edit ON THE DEVICE that wrote it (not now()),
-- so last-write-wins compares edit times across devices.
create table if not exists public.cadence_state (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null
);

-- Pro is sync (JP, 2026-11-17). Who has Pro lives in `entitlements`, by email: `early_bird` is
-- the lifetime purchase (set by the Paddle webhook, see the site repo), `pro` is Pro given by hand.
-- The same table as the site's supabase/presale.sql; created here too so either file can run first.
create table if not exists public.entitlements (
  email           text primary key,                 -- lower-cased; matched to the signed-in email
  early_bird      boolean not null default false,
  source_order_id text,
  updated_at      timestamptz not null default now()
);
alter table public.entitlements add column if not exists pro boolean not null default false;
alter table public.entitlements enable row level security;

drop policy if exists "entitlements: read own" on public.entitlements;
create policy "entitlements: read own"
  on public.entitlements
  for select
  to authenticated
  using (email = lower((select auth.jwt() ->> 'email')));

-- Does the signed-in email have Pro? security definer: reads only the caller's own row.
create or replace function public.has_pro()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.entitlements e
    where e.email = lower(auth.jwt() ->> 'email')
      and (e.pro or e.early_bird)
  );
$$;

revoke execute on function public.has_pro() from public, anon;
grant execute on function public.has_pro() to authenticated;

-- People who already synced before Pro existed keep it: an email with a synced copy and no
-- entitlements row yet gets pro = true. A row that already exists is never changed here, so
-- running this file again doesn't give Pro back to someone refunded.
insert into public.entitlements (email, pro)
select lower(u.email), true
from public.cadence_state s
join auth.users u on u.id = s.user_id
where u.email is not null
on conflict (email) do nothing;

-- Row Level Security: each signed-in user sees and writes only their own row, and only with Pro.
alter table public.cadence_state enable row level security;

drop policy if exists "cadence_state: select own" on public.cadence_state;
create policy "cadence_state: select own"
  on public.cadence_state
  for select
  to authenticated
  using (user_id = (select auth.uid()) and (select public.has_pro()));

drop policy if exists "cadence_state: insert own" on public.cadence_state;
create policy "cadence_state: insert own"
  on public.cadence_state
  for insert
  to authenticated
  with check (user_id = (select auth.uid()) and (select public.has_pro()));

drop policy if exists "cadence_state: update own" on public.cadence_state;
create policy "cadence_state: update own"
  on public.cadence_state
  for update
  to authenticated
  using (user_id = (select auth.uid()) and (select public.has_pro()))
  with check (user_id = (select auth.uid()) and (select public.has_pro()));

-- No delete policy: the app never deletes rows (deleting the auth user cascades).

-- Table privileges: signed-in users may read, insert and update (RLS still applies);
-- anonymous visitors get nothing.
revoke all on table public.cadence_state from anon, authenticated;
grant select, insert, update on table public.cadence_state to authenticated;

-- Atomic last-write-wins write.
-- Inserts the caller's row, or overwrites it only when the stored updated_at is
-- older than p_updated_at. Always returns the row that is now stored: ours if we
-- won, the newer server copy if we lost. Runs with the caller's rights (RLS applies).
create or replace function public.push_state(p_data jsonb, p_updated_at timestamptz)
returns table (data jsonb, updated_at timestamptz)
language plpgsql
volatile
security invoker
set search_path = ''
as $$
#variable_conflict use_column
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'push_state: not signed in' using errcode = '42501';
  end if;

  insert into public.cadence_state as s (user_id, data, updated_at)
  values (v_uid, p_data, p_updated_at)
  on conflict (user_id) do update
    set data = excluded.data,
        updated_at = excluded.updated_at
    where s.updated_at < excluded.updated_at;

  return query
    select s.data, s.updated_at
    from public.cadence_state as s
    where s.user_id = v_uid;
end;
$$;

revoke execute on function public.push_state(jsonb, timestamptz) from public, anon;
grant execute on function public.push_state(jsonb, timestamptz) to authenticated;

-- Delete my account (Quebec Law 25; JP, 2026-11-07). Deletes the caller's synced copy and their
-- sign-in (the auth user; its sessions go with it). The device keeps its own copy. Purchase and
-- early-bird rows, kept by email for tax records, aren't touched here.
-- security definer: only the database owner may delete from auth.users. It acts on auth.uid()
-- alone, so nobody can delete anyone else.
create or replace function public.delete_my_account()
returns void
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'delete_my_account: not signed in' using errcode = '42501';
  end if;
  delete from public.cadence_state where user_id = v_uid;
  delete from auth.users where id = v_uid;
end;
$$;

revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
