-- gogo · แยกค่าเสื้อผ้า + ยอดค้าง (ติ๊ก = จ่ายคืน/เคลียร์กันแล้ว)

-- 1) trip expenses: "settled" = cleared between the two (not owed anymore)
alter table public.expenses add column if not exists settled boolean not null default false;

-- 2) clothes: price (THB incl. shipping), who paid, paid back?
alter table public.clothes add column if not exists price numeric(10,2) check (price is null or (price >= 0 and price < 1000000));
alter table public.clothes add column if not exists paid_by text not null default 'aum' check (paid_by in ('aum','tiw'));
alter table public.clothes add column if not exists settled boolean not null default false;

-- 3) Qingdao prices from qingdao_trip_spent.xlsx (only fills empty prices)
update public.clothes c
set price = v.price
from public.trips t, (values
  ('เสื้อขน 3 เป๋า ขาวน้ำเงิน', 258.50),
  ('ไหมพรมครีมเปีย', 360.00),
  ('ไหมพรมกรม', 310.00),
  ('ฮีทกรมคอกลม', 190.00),
  ('ฮีทคอเต่าดำ', 200.00),
  ('ฮีทคอเต่าดำ ผ้าลายทาง', 200.00),
  ('เสื้อนวมครีม', 310.00),
  ('B80 เสื้อขนน้ำตาลตัวยาว', 418.50),
  ('B97 ฟรีซดำ', 309.50),
  ('กางเกงขาสั้นสีน้ำตาล', 131.88),
  ('เสื้อคอปกดำยาว', 290.00),
  ('รหัส159 เสื้อขนหูกระต่าย', 290.00),
  ('รหัส215 เสื้อสเวตน้ำตาล', 100.00),
  ('รหัส284 เสื้อสเวตสีชมพู', 100.00),
  ('รหัส287 เสื้อดำหนา (กันลม)', 200.00),
  ('ฮู้ดฟรีซดำ', 199.00),
  ('ไหมพรมครีม haft sip', 189.00),
  ('รหัสง31 เสื้อ 3 สี haft กระดุม', 182.00),
  ('รหัส09 สเวตขนขาว', 182.00),
  ('รหัสง02 เสื้อขาว haft กระดุมกรม', 182.00),
  ('เสื้อขาวคอปีน', 135.00),
  ('เสื้อน้ำตาลอ่อนคอปีน', 135.00),
  ('ถุงน่องบุขน 330 กรัม', 233.31),
  ('ฮู้ดไหมพรมสีฟ้า', 126.88),
  ('เสื้อL98 สีฟ้าไหมพรมฮาฟซิบ', 173.88),
  ('เสื้อL35 สีเทาคอกลม', 127.88),
  ('กรมไหมพรม ผ้าเรียบๆ', 138.00),
  ('คอเต่าสีน้ำตาลอ่อน', 133.00),
  ('เสื้อดำคอกลมไหมพรม', 133.00),
  ('D01 โค้ชน้ำตาล', 250.00),
  ('ช18 ไหมพรมขาวฮู้ด', 96.70),
  ('ช16 ไหมพรมสีขาว คอกลม', 96.70),
  ('ช102 คอปีนสีน้ำตาลอ่อน', 106.70),
  ('ช113 ไหมพรมสีน้ำตาล', 106.70),
  ('กางเกงบุกันหนาว ยูนิโค่ สีน้ำตาลเทา', 360.00),
  ('กางเกงบุกันหนาว ยูนิโค่ สีดำ', 220.00),
  ('กางเกงบุกันหนาว ยูนิโค่ สีน้ำตาล', 300.00)
) as v(name, price)
where t.slug = 'qingdao-2027' and c.trip_id = t.id and c.name = v.name and c.price is null;
