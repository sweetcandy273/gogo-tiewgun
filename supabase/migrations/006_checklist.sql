-- gogo เที่ยวกัน · เช็กลิสต์ที่ติ๊กแล้วเห็นทั้งสองเครื่อง
-- Run once in Supabase > SQL Editor. Open access, same as the other tables.

create table if not exists public.checklist (
  trip_id    uuid not null references public.trips(id) on delete cascade,
  -- 'g:<guide item text>' for items from the trip book, 'c:<uuid>' for items added in the app
  item_key   text not null check (char_length(item_key) between 3 and 250 and item_key ~ '^(g|c):'),
  label      text check (label is null or char_length(label) between 1 and 200),
  done       boolean not null default false,
  done_by    text check (done_by in ('aum','tiw')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (trip_id, item_key),
  -- own items need a label
  check (item_key like 'g:%' or label is not null)
);

drop trigger if exists checklist_touch on public.checklist;
create trigger checklist_touch before update on public.checklist
for each row execute function public.touch_updated_at();

alter table public.checklist enable row level security;
drop policy if exists "open checklist" on public.checklist;
create policy "open checklist" on public.checklist for all to anon, authenticated using (true) with check (true);

do $$
begin
  begin alter publication supabase_realtime add table public.checklist; exception when duplicate_object then null; end;
end $$;

-- Qingdao: insurance is already bought (Sompo Standard, paid 827.28 for two)
insert into public.checklist (trip_id, item_key, done)
select t.id, 'g:ประกันเดินทาง Sompo Standard', true
from public.trips t where t.slug = 'qingdao-2027'
on conflict (trip_id, item_key) do nothing;
