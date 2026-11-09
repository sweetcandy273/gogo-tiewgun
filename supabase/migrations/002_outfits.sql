-- gogo เที่ยวกัน · ชุดแต่งกาย (wardrobe + outfit per day)
-- Run once in Supabase > SQL Editor (after schema.sql). Open access, same as trips/expenses.

-- 1) Clothes owned for a trip
create table if not exists public.clothes (
  id          uuid primary key default gen_random_uuid(),
  trip_id     uuid not null references public.trips(id) on delete cascade,
  owner       text check (owner in ('aum','tiw')),               -- null = not set yet
  name        text not null check (char_length(name) between 1 and 120),
  kind        text not null default 'top' check (kind in ('inner','top','outer','bottom','shoes','accessory')),
  photo_url   text check (photo_url is null or photo_url ~ '^https://'),
  photo_path  text check (photo_path is null or char_length(photo_path) <= 200),
  note        text check (note is null or char_length(note) <= 300),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists clothes_trip_idx on public.clothes (trip_id, owner, kind);

drop trigger if exists clothes_touch on public.clothes;
create trigger clothes_touch before update on public.clothes
for each row execute function public.touch_updated_at();

alter table public.clothes enable row level security;
drop policy if exists "open clothes" on public.clothes;
create policy "open clothes" on public.clothes for all to anon, authenticated using (true) with check (true);

-- 2) Which clothes are worn on which day
create table if not exists public.outfit_picks (
  trip_id   uuid not null references public.trips(id) on delete cascade,
  day       date not null,
  cloth_id  uuid not null references public.clothes(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (day, cloth_id)
);
create index if not exists outfit_picks_trip_idx on public.outfit_picks (trip_id, day);

alter table public.outfit_picks enable row level security;
drop policy if exists "open outfit picks" on public.outfit_picks;
create policy "open outfit picks" on public.outfit_picks for all to anon, authenticated using (true) with check (true);

-- 3) Photo storage (public read; open upload limited to images ≤ 5 MB in this bucket)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('clothes', 'clothes', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public = true, file_size_limit = 5242880,
  allowed_mime_types = array['image/jpeg','image/png','image/webp'];

drop policy if exists "clothes photos insert" on storage.objects;
drop policy if exists "clothes photos update" on storage.objects;
drop policy if exists "clothes photos delete" on storage.objects;
create policy "clothes photos insert" on storage.objects for insert to anon, authenticated with check (bucket_id = 'clothes');
create policy "clothes photos update" on storage.objects for update to anon, authenticated using (bucket_id = 'clothes') with check (bucket_id = 'clothes');
create policy "clothes photos delete" on storage.objects for delete to anon, authenticated using (bucket_id = 'clothes');

-- 4) Realtime
do $$
begin
  begin alter publication supabase_realtime add table public.clothes;      exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.outfit_picks; exception when duplicate_object then null; end;
end $$;
