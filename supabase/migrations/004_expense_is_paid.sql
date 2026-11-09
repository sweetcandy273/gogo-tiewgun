-- ติ๊ก "จ่ายแล้ว" ให้ค่าใช้จ่าย (false = รอจ่าย/ตั้งงบไว้ ไม่นับในยอดรวม)
alter table public.expenses add column if not exists is_paid boolean not null default true;
