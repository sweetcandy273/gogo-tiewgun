# gogo เที่ยวกัน

เว็บแอปเก็บทริปของอุ้มกับทิว (ไม่ต้องล็อกอิน) หน้าแรกเป็นรายการ **Trips** (ชิงเต่า ม.ค. 2570 คือทริป 1) แต่ละทริปมี **ค่าใช้จ่ายร่วมกัน 2 คน** (เพิ่ม/แก้/ลบ, สกุลท้องถิ่น/฿, ใครจ่าย, หาร 2 หรือของคนเดียว, สรุปว่าใครต้องโอนให้ใคร) และถ้ามีไกด์ จะมีแผนรายวัน คำศัพท์ เช็กลิสต์

**Stack:** Vue 3 + Vite + TypeScript + Tailwind CSS 4 · Supabase (Postgres + Auth + Realtime) · Netlify (static hosting)

```
src/
  trips/registry.ts     ไกด์ของแต่ละทริป (key = slug ของทริป)
  trips/qingdao-2027/   แผนรายวัน คำศัพท์ เที่ยวบิน โรงแรม เช็กลิสต์ (จากเล่ม PDF v18)
  lib/settle.ts         คำนวณยอด/ใครโอนให้ใคร (หน่วยสตางค์, มี unit test)
  lib/repo.ts           Supabase repo + Local repo (โหมดทดลอง)
  views/TripsView.vue   หน้าแรก: รายการทริป + สร้างทริปใหม่
  views/trip/           หน้าในทริป: ภาพรวม / รายวัน / ค่าใช้จ่าย / คำศัพท์ / ข้อมูล
supabase/schema.sql     ตาราง trips, expenses + RLS (เปิดให้ทุกคน) + realtime + ทริป 1
supabase/seed.sql       ค่าใช้จ่ายชิงเต่าที่จ่ายไปแล้ว (ไม่มีเสื้อผ้า) — ไม่บังคับ
public/trips/           รูปของแต่ละทริป (WebP)
```

## รันในเครื่อง

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit test (Vitest)
npm run build      # type-check + build → dist/
```

ถ้ายังไม่ตั้งค่า `.env.local` แอปจะรันใน **โหมดทดลอง** (ข้อมูลเก็บในเบราว์เซอร์นั้นเท่านั้น)

## ตั้งค่า Supabase (ทำครั้งเดียว)

1. สร้างโปรเจกต์ที่ supabase.com (region Singapore) เปิด Data API ไว้
2. รัน `supabase/schema.sql` ใน **SQL Editor** (สร้างตาราง + ทริป 1) แล้วรันไฟล์ใน `supabase/migrations/` ตามลำดับเลข (ชุดแต่งกาย + รูป, ติ๊กจ่ายแล้ว, เช็กลิสต์ร่วม) · `supabase/seed.sql` ไม่บังคับ
3. **Project Settings → API Keys** คัดลอก Project URL และ publishable key ใส่ `.env.local`:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_KEY=sb_publishable_xxx
```

> **เว็บนี้ไม่มีระบบล็อกอิน** ใครมีลิงก์เว็บก็ดูและแก้/ลบทริปกับค่าใช้จ่ายได้ (เลือกแบบนี้เอง) ฐานข้อมูลยังบังคับรูปแบบข้อมูลด้วย CHECK constraints
> publishable key ใส่ในหน้าเว็บได้ตามปกติ **ห้ามใช้ secret / service_role key ในเว็บเด็ดขาด**

## Deploy บน Netlify

1. push repo นี้ขึ้น GitHub
2. Netlify → Add new site → Import from GitHub → เลือก repo (build: `npm run build`, publish: `dist` — อ่านจาก `netlify.toml` อัตโนมัติ)
3. **Site configuration → Environment variables** ใส่ `VITE_SUPABASE_URL` และ `VITE_SUPABASE_KEY`
4. Deploy อีกครั้ง (env ใช้ตอน build ถ้าเพิ่มทีหลังต้อง redeploy) — ถ้าเห็นแถบเหลือง "โหมดทดลอง" แปลว่า env ยังไม่เข้า

## หมายเหตุ

- **ชุดแต่งกาย** (แท็บ "ชุด"): เพิ่มเสื้อผ้าพร้อมรูป (ย่อรูปในเครื่องก่อนอัปโหลด ≤1080px) แล้วเลือกว่าแต่ละวันใครใส่ชิ้นไหน · บอกจำนวนชิ้นและชิ้นที่ยังไม่ได้ใส่
- **ค่าใช้จ่าย** แยก 2 แท็บ: "ในทริป" กับ "เสื้อผ้า" (ราคาเสื้อผ้าใส่ในแท็บชุด ค่าเริ่มต้นอุ้มเป็นคนจ่าย) ด้านบนสรุป **ยอดค้างรวม** ว่าใครต้องโอนให้ใคร · ติ๊ก ✓ ที่รายการ = จ่ายคืน/เคลียร์กันแล้ว → ไม่นับในยอดค้าง
- **คำศัพท์**: กด 🔊 ฟังเสียงภาษาจีนด้วยเสียงในเครื่อง (Web Speech API) · คำจีนทุกคำในแผนกดเพื่อคัดลอกได้
- เรตแลกเงินตั้งต่อทริป (แตะ "1 CNY = ฿…" ในหน้าค่าใช้จ่าย) ใช้ร่วมกันทั้งสองเครื่อง
- ทริปใหม่สร้างในแอปได้เลย (ปุ่ม + หน้าแรก) ถ้าอยากมีแผนรายวันด้วย เพิ่มโฟลเดอร์ใน `src/trips/` แล้วลงทะเบียนใน `registry.ts` ด้วย slug เดียวกัน
- รายการที่ยังไม่ระบุ "ใครจ่าย" จะนับในยอดรวม แต่ไม่นับในยอดโอน
- โปรเจกต์ Supabase แบบฟรีจะถูกพักถ้าไม่มีการใช้งานนานราว 1 สัปดาห์ ถ้าเปิดไม่ได้ให้เข้า dashboard กด Restore
- เว็บต้องใช้อินเทอร์เน็ต ในจีนใช้ eSIM/โรมมิ่งที่ออกเน็ตนอกจีน (Netlify/Supabase ไม่ได้อยู่ในจีน ถ้าใช้ซิมจีนหรือ Wi-Fi โรงแรมอาจช้าหรือเข้าไม่ได้) — ฟอนต์ฝังมากับเว็บแล้ว ไม่พึ่ง Google Fonts
