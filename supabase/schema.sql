-- gogo เที่ยวกัน — run once in Supabase > SQL Editor.
-- Member emails are NOT stored in this repo: add them with supabase/members.example.sql.

-- 1) Allow-list: only these logins may read/write (even if someone else gets an account)
create table if not exists public.trip_members (
  email text primary key
);
alter table public.trip_members enable row level security;
-- no policies: clients can neither read nor change the allow-list

create or replace function public.is_trip_member()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.trip_members m
    where lower(m.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;
revoke all on function public.is_trip_member() from public;
grant execute on function public.is_trip_member() to authenticated;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- 2) Trips
create table if not exists public.trips (
  id           uuid primary key default gen_random_uuid(),
  slug         text not null unique check (slug ~ '^[a-z0-9][a-z0-9-]{1,48}$'),
  name         text not null check (char_length(name) between 1 and 80),
  start_date   date,
  end_date     date,
  currency     text not null default 'THB' check (currency ~ '^[A-Z]{3}$'),   -- local currency
  rate_to_thb  numeric(10,4) not null default 1 check (rate_to_thb > 0 and rate_to_thb < 100000),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  check (end_date is null or start_date is null or end_date >= start_date)
);

drop trigger if exists trips_touch on public.trips;
create trigger trips_touch before update on public.trips
for each row execute function public.touch_updated_at();

alter table public.trips enable row level security;
drop policy if exists "members all trips" on public.trips;
create policy "members all trips" on public.trips for all to authenticated
  using (public.is_trip_member()) with check (public.is_trip_member());

-- 3) Expenses (per trip)
create table if not exists public.expenses (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  spent_on    date not null default current_date,
  category    text not null check (category in ('booking','transport','food','ticket','shopping','other')),
  title       text not null check (char_length(title) between 1 and 200),
  currency    text not null check (currency ~ '^[A-Z]{3}$'),
  amount      numeric(12,2) not null check (amount >= 0 and amount < 10000000),
  paid_by     text check (paid_by in ('aum','tiw')),          -- null = not set yet
  split       text not null default 'half' check (split in ('half','aum','tiw')),
  note        text check (note is null or char_length(note) <= 500),
  created_by  uuid default auth.uid() references auth.users(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists expenses_trip_idx on public.expenses (trip_id, spent_on desc, created_at desc);

drop trigger if exists expenses_touch on public.expenses;
create trigger expenses_touch before update on public.expenses
for each row execute function public.touch_updated_at();

alter table public.expenses enable row level security;
drop policy if exists "members all expenses" on public.expenses;
create policy "members all expenses" on public.expenses for all to authenticated
  using (public.is_trip_member()) with check (public.is_trip_member());

-- 4) Realtime: the other phone sees changes without refreshing
do $$
begin
  begin alter publication supabase_realtime add table public.expenses; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.trips;    exception when duplicate_object then null; end;
end $$;

-- 5) Trip #1
insert into public.trips (slug, name, start_date, end_date, currency, rate_to_thb)
values ('qingdao-2027', 'ชิงเต่า 青岛', '2027-01-13', '2027-01-18', 'CNY', 4.6)
on conflict (slug) do nothing;
