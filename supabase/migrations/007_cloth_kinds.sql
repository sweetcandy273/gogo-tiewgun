-- gogo เที่ยวกัน · เพิ่มหมวดเสื้อผ้า: ชุดนอน (sleep), ชุดสนามบิน (airport)
alter table public.clothes drop constraint if exists clothes_kind_check;
alter table public.clothes add constraint clothes_kind_check
  check (kind in ('inner','top','outer','bottom','shoes','sleep','airport','accessory'));
