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

-- Row Level Security: each signed-in user sees and writes only their own row.
alter table public.cadence_state enable row level security;

drop policy if exists "cadence_state: select own" on public.cadence_state;
create policy "cadence_state: select own"
  on public.cadence_state
  for select
  to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists "cadence_state: insert own" on public.cadence_state;
create policy "cadence_state: insert own"
  on public.cadence_state
  for insert
  to authenticated
  with check (user_id = (select auth.uid()));

drop policy if exists "cadence_state: update own" on public.cadence_state;
create policy "cadence_state: update own"
  on public.cadence_state
  for update
  to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

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
