-- Optional: Qingdao clothes from qingdao_trip_spent.xlsx (owner null = not set yet)
insert into public.clothes (trip_id, owner, name, kind)
select t.id, v.owner, v.name, v.kind
from public.trips t
cross join (values
  ('tiw', 'เสื้อขน 3 เป๋า ขาวน้ำเงิน', 'top'),
  ('aum', 'ไหมพรมครีมเปีย', 'top'),
  ('tiw', 'ไหมพรมกรม', 'top'),
  ('tiw', 'ฮีทกรมคอกลม', 'inner'),
  ('aum', 'ฮีทคอเต่าดำ', 'inner'),
  ('aum', 'ฮีทคอเต่าดำ ผ้าลายทาง', 'inner'),
  ('aum', 'เสื้อนวมครีม', 'outer'),
  ('aum', 'B80 เสื้อขนน้ำตาลตัวยาว', 'outer'),
  ('tiw', 'B97 ฟรีซดำ', 'top'),
  ('aum', 'กางเกงขาสั้นสีน้ำตาล', 'bottom'),
  ('tiw', 'เสื้อคอปกดำยาว', 'top'),
  ('aum', 'รหัส159 เสื้อขนหูกระต่าย', 'top'),
  ('tiw', 'รหัส215 เสื้อสเวตน้ำตาล', 'top'),
  ('aum', 'รหัส284 เสื้อสเวตสีชมพู', 'top'),
  ('tiw', 'รหัส287 เสื้อดำหนา (กันลม)', 'outer'),
  ('tiw', 'ฮู้ดฟรีซดำ', 'top'),
  ('tiw', 'ไหมพรมครีม haft sip', 'top'),
  ('tiw', 'รหัสง31 เสื้อ 3 สี haft กระดุม', 'top'),
  ('tiw', 'รหัส09 สเวตขนขาว', 'top'),
  ('tiw', 'รหัสง02 เสื้อขาว haft กระดุมกรม', 'top'),
  ('aum', 'เสื้อขาวคอปีน', 'top'),
  ('aum', 'เสื้อน้ำตาลอ่อนคอปีน', 'top'),
  ('aum', 'ถุงน่องบุขน 330 กรัม', 'inner'),
  ('aum', 'ฮู้ดไหมพรมสีฟ้า', 'top'),
  ('aum', 'เสื้อL98 สีฟ้าไหมพรมฮาฟซิบ', 'top'),
  (null, 'เสื้อL35 สีเทาคอกลม', 'top'),
  ('aum', 'กรมไหมพรม ผ้าเรียบๆ', 'top'),
  (null, 'คอเต่าสีน้ำตาลอ่อน', 'top'),
  (null, 'เสื้อดำคอกลมไหมพรม', 'top'),
  ('aum', 'D01 โค้ชน้ำตาล', 'outer'),
  (null, 'ช18 ไหมพรมขาวฮู้ด', 'top'),
  (null, 'ช16 ไหมพรมสีขาว คอกลม', 'top'),
  (null, 'ช102 คอปีนสีน้ำตาลอ่อน', 'top'),
  ('aum', 'ช113 ไหมพรมสีน้ำตาล', 'top'),
  ('tiw', 'กางเกงบุกันหนาว ยูนิโค่ สีน้ำตาลเทา', 'bottom'),
  ('tiw', 'กางเกงบุกันหนาว ยูนิโค่ สีดำ', 'bottom'),
  ('tiw', 'กางเกงบุกันหนาว ยูนิโค่ สีน้ำตาล', 'bottom')
) as v(owner, name, kind)
where t.slug = 'qingdao-2027'
  and not exists (select 1 from public.clothes c where c.trip_id = t.id);
