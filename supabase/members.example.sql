-- Copy, put the real login emails, and run in Supabase > SQL Editor.
-- Do not commit real emails to a public repo.
insert into public.trip_members (email) values
  ('person1@example.com'),
  ('person2@example.com')
on conflict do nothing;
