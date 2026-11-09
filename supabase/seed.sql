-- Optional: Qingdao expenses already paid before the trip (clothing left out).
-- paid_by is null — set it in the app.
insert into public.expenses (trip_id, spent_on, category, title, currency, amount, paid_by, split, note)
select t.id, v.spent_on::date, v.category, v.title, 'THB', v.amount, null, 'half', v.note
from public.trips t
cross join (values
  ('2026-10-24', 'booking', 'แพ็กเกจตั๋ว CZ 4 เที่ยว + โรงแรมชิงเต่า 4 คืน', 24780.00, 'Trip.com'),
  ('2026-10-24', 'booking', 'Naiya Hotel กวางโจว 1 คืน',                    770.19,  'Trip.com'),
  ('2026-11-03', 'other',   'ประกันเดินทาง Sompo TravelJoy Standard',        827.28,  '฿413.64/คน')
) as v(spent_on, category, title, amount, note)
where t.slug = 'qingdao-2027';
