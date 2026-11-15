-- gogo เที่ยวกัน · ถังขยะทริป (ย้ายไปถังขยะ / กู้คืนได้ แทนการลบจริง)
-- วางทั้งไฟล์ใน Supabase > SQL Editor แล้วกด Run (รันซ้ำได้)
alter table public.trips add column if not exists deleted_at timestamptz;
