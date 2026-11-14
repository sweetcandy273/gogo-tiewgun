-- gogo เที่ยวกัน · ตู้เก็บข้อมูลการจอง (ปลดล็อกด้วยรหัสตัวเลข 4-8 หลัก)
-- Run once in Supabase > SQL Editor. Then set the code (see bottom).
--
-- Unlike the other tables this one is NOT open to the anon key:
--   * the tables have RLS on and no policies, and all table privileges are revoked
--   * the app can only call the vault_* functions below (security definer)
--   * the code is stored as a bcrypt hash; wrong guesses are counted and locked out server-side
--   * a correct code returns a random token valid for 1 year; only its SHA-256 is stored,
--     so the phone never keeps the code itself
--
-- Do not store passport / card numbers here: a 4-digit code is convenient, not strong.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------- tables
create table if not exists public.bookings (
  id         uuid primary key default gen_random_uuid(),
  trip_id    uuid not null references public.trips(id) on delete cascade,
  kind       text not null check (kind in ('flight','hotel','transport','ticket','insurance','other')),
  title      text not null check (char_length(title) between 1 and 200),
  ref        text check (ref is null or char_length(ref) <= 200),
  on_date    date,
  details    text check (details is null or char_length(details) <= 4000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings
for each row execute function public.touch_updated_at();

create table if not exists public.vault_config (
  trip_id      uuid primary key references public.trips(id) on delete cascade,
  code_hash    text not null,
  failed_count int  not null default 0,   -- wrong guesses since the last lock / success
  strikes      int  not null default 0,   -- how many times it has locked (lock time doubles)
  locked_until timestamptz
);

create table if not exists public.vault_sessions (
  token_hash   text primary key,           -- sha256 hex of the token held by the phone
  trip_id      uuid not null references public.trips(id) on delete cascade,
  label        text,
  created_at   timestamptz not null default now(),
  expires_at   timestamptz not null,
  last_used_at timestamptz not null default now()
);

alter table public.bookings       enable row level security;
alter table public.vault_config   enable row level security;
alter table public.vault_sessions enable row level security;
-- (no policies on purpose = anon / authenticated can't read or write these tables directly)
revoke all on public.bookings, public.vault_config, public.vault_sessions from anon, authenticated;

-- ---------------------------------------------------------------- internal helper
create or replace function public._vault_trip(p_token text) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_hash text;
  v_trip uuid;
begin
  if p_token is null or p_token !~ '^[0-9a-f]{64}$' then
    raise exception 'vault_unauthorized' using errcode = '28000';
  end if;
  v_hash := encode(digest(p_token, 'sha256'), 'hex');
  select trip_id into v_trip from public.vault_sessions where token_hash = v_hash and expires_at > now();
  if v_trip is null then
    raise exception 'vault_unauthorized' using errcode = '28000';
  end if;
  update public.vault_sessions set last_used_at = now()
   where token_hash = v_hash and last_used_at < now() - interval '1 hour';
  return v_trip;
end $$;

-- ---------------------------------------------------------------- unlock
-- Returns {ok:true, token, expires_at} | {ok:false, reason:'wrong'|'locked'|'not_set'|'bad_format', ...}
-- A wrong code returns normally (not an exception) so the counter update is committed.
create or replace function public.vault_unlock(p_slug text, p_code text, p_label text default null)
returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare
  c        public.vault_config%rowtype;
  v_trip   uuid;
  v_token  text;
  v_exp    timestamptz;
  v_wait   int;
begin
  if p_code is null or p_code !~ '^[0-9]{4,8}$' then
    return jsonb_build_object('ok', false, 'reason', 'bad_format');
  end if;

  select id into v_trip from public.trips where slug = p_slug;
  if v_trip is null then
    return jsonb_build_object('ok', false, 'reason', 'not_set');
  end if;

  -- row lock: parallel guesses are handled one at a time, so they can't dodge the counter
  select * into c from public.vault_config where trip_id = v_trip for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_set');
  end if;

  if c.locked_until is not null and c.locked_until > now() then
    return jsonb_build_object('ok', false, 'reason', 'locked',
                              'retry_after', ceil(extract(epoch from (c.locked_until - now())))::int);
  end if;

  if c.code_hash = crypt(p_code, c.code_hash) then
    update public.vault_config set failed_count = 0, strikes = 0, locked_until = null where trip_id = v_trip;
    delete from public.vault_sessions where expires_at < now();
    v_token := encode(gen_random_bytes(32), 'hex');
    v_exp   := now() + interval '1 year';
    insert into public.vault_sessions (token_hash, trip_id, label, expires_at)
    values (encode(digest(v_token, 'sha256'), 'hex'), v_trip, left(p_label, 80), v_exp);
    return jsonb_build_object('ok', true, 'token', v_token, 'expires_at', v_exp);
  end if;

  if c.failed_count + 1 >= 5 then
    -- 5 wrong in a row: lock 15 min, then 30 min, 1 h, ... up to 12 h
    v_wait := least((900 * power(2, least(c.strikes, 6)))::int, 43200);
    update public.vault_config
       set failed_count = 0, strikes = c.strikes + 1, locked_until = now() + make_interval(secs => v_wait)
     where trip_id = v_trip;
    return jsonb_build_object('ok', false, 'reason', 'locked', 'retry_after', v_wait);
  end if;

  update public.vault_config set failed_count = c.failed_count + 1 where trip_id = v_trip;
  return jsonb_build_object('ok', false, 'reason', 'wrong', 'remaining', 5 - (c.failed_count + 1));
end $$;

-- ---------------------------------------------------------------- bookings
create or replace function public.vault_list(p_token text) returns setof public.bookings
language plpgsql security definer set search_path = public, extensions as $$
declare v_trip uuid := public._vault_trip(p_token);
begin
  return query select * from public.bookings where trip_id = v_trip
               order by on_date nulls last, created_at;
end $$;

-- p_id null = insert, otherwise update that booking (of this trip only)
create or replace function public.vault_save(
  p_token text, p_id uuid, p_kind text, p_title text, p_ref text, p_on_date date, p_details text
) returns public.bookings
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_trip uuid := public._vault_trip(p_token);
  r public.bookings;
begin
  if p_id is null then
    insert into public.bookings (trip_id, kind, title, ref, on_date, details)
    values (v_trip, p_kind, btrim(p_title), nullif(btrim(p_ref), ''), p_on_date, nullif(btrim(p_details), ''))
    returning * into r;
  else
    update public.bookings
       set kind = p_kind, title = btrim(p_title), ref = nullif(btrim(p_ref), ''),
           on_date = p_on_date, details = nullif(btrim(p_details), '')
     where id = p_id and trip_id = v_trip
    returning * into r;
    if not found then raise exception 'booking not found'; end if;
  end if;
  return r;
end $$;

create or replace function public.vault_delete(p_token text, p_id uuid) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_trip uuid := public._vault_trip(p_token);
begin
  delete from public.bookings where id = p_id and trip_id = v_trip;
end $$;

-- ---------------------------------------------------------------- sign out
-- this device only (silent if the token is already gone)
create or replace function public.vault_lock(p_token text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  if p_token is not null and p_token ~ '^[0-9a-f]{64}$' then
    delete from public.vault_sessions where token_hash = encode(digest(p_token, 'sha256'), 'hex');
  end if;
end $$;

-- every device of the trip (lost phone)
create or replace function public.vault_revoke_all(p_token text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_trip uuid := public._vault_trip(p_token);
begin
  delete from public.vault_sessions where trip_id = v_trip;
end $$;

-- ---------------------------------------------------------------- admin (SQL editor only)
-- Set or change the code. Also signs every device out.
create or replace function public.vault_set_code(p_slug text, p_code text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare v_trip uuid;
begin
  if p_code is null or p_code !~ '^[0-9]{4,8}$' then raise exception 'code must be 4-8 digits'; end if;
  select id into v_trip from public.trips where slug = p_slug;
  if v_trip is null then raise exception 'trip % not found', p_slug; end if;
  insert into public.vault_config (trip_id, code_hash)
  values (v_trip, crypt(p_code, gen_salt('bf', 8)))
  on conflict (trip_id) do update
    set code_hash = excluded.code_hash, failed_count = 0, strikes = 0, locked_until = null;
  delete from public.vault_sessions where trip_id = v_trip;
end $$;

-- Clear a lock-out (e.g. you fat-fingered it five times).
create or replace function public.vault_reset_lock(p_slug text) returns void
language plpgsql security definer set search_path = public, extensions as $$
begin
  update public.vault_config set failed_count = 0, strikes = 0, locked_until = null
   where trip_id = (select id from public.trips where slug = p_slug);
end $$;

-- ---------------------------------------------------------------- privileges
revoke all on function public._vault_trip(text)                      from public, anon, authenticated;
revoke all on function public.vault_set_code(text, text)             from public, anon, authenticated;
revoke all on function public.vault_reset_lock(text)                 from public, anon, authenticated;
revoke all on function public.vault_unlock(text, text, text)         from public, anon, authenticated;
revoke all on function public.vault_list(text)                       from public, anon, authenticated;
revoke all on function public.vault_save(text, uuid, text, text, text, date, text) from public, anon, authenticated;
revoke all on function public.vault_delete(text, uuid)               from public, anon, authenticated;
revoke all on function public.vault_lock(text)                       from public, anon, authenticated;
revoke all on function public.vault_revoke_all(text)                 from public, anon, authenticated;

grant execute on function public.vault_unlock(text, text, text)         to anon, authenticated;
grant execute on function public.vault_list(text)                       to anon, authenticated;
grant execute on function public.vault_save(text, uuid, text, text, text, date, text) to anon, authenticated;
grant execute on function public.vault_delete(text, uuid)               to anon, authenticated;
grant execute on function public.vault_lock(text)                       to anon, authenticated;
grant execute on function public.vault_revoke_all(text)                 to anon, authenticated;

-- ---------------------------------------------------------------- STEP 2: set the code
-- Run this line yourself with your own code (the code is not in this repo):
--
--   select public.vault_set_code('qingdao-2027', '1234');
--
-- Forgot it / want a new one: run the same line again (signs all devices out).
-- Locked out: select public.vault_reset_lock('qingdao-2027');
