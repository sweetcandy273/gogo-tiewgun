import type { Day, Guide, Phrase } from '../registry'
import data from './guide.json'

const P = '/trips/qingdao-2027'

const guide: Guide = {
  hero: {
    src: `${P}/photo-05.webp`, alt: 'Wind in May · May 4th Square',
    kicker: 'QINGDAO · 青岛', title: 'ชิงเต่า 13–18 ม.ค. 2570',
    sub: 'ภูเก็ต → กวางโจว → ชิงเต่า · 6 วัน 5 คืน', departAt: '2027-01-13T17:25:00+07:00',
  },
  amapCity: '青岛',
  // DAY 1 and DAY 2 morning are in Guangzhou
  days: (data.days as Day[]).map((d, i) => ({ ...d, city: i < 2 ? '广州' : '青岛' })),
  phrases: data.phrases as { section: string; items: Phrase[] }[],
  drinks: [
    ['แก้วเล็ก', '小杯', 'xiǎo bēi'], ['แก้วกลาง', '中杯', 'zhōng bēi'], ['แก้วใหญ่', '大杯', 'dà bēi'],
    ['น้ำแข็งน้อย', '少冰', 'shǎo bīng'], ['น้ำแข็งปกติ', '正常冰', 'zhèngcháng bīng'], ['ไม่ใส่น้ำแข็ง', '去冰', 'qù bīng'],
    ['ไม่หวาน', '无糖', 'wú táng'], ['หวานน้อย', '少糖', 'shǎo táng'], ['ร้อน', '热的', 'rè de'],
  ],
  flightsTitle: 'เที่ยวบิน China Southern',
  flights: [
    { leg: 'ไป 1', date: 'พุธ 13 ม.ค.', no: 'CZ6064', route: 'ภูเก็ต HKT → กวางโจว CAN T2', time: '17:25 → 22:15' },
    { leg: 'ไป 2', date: 'พฤหัส 14 ม.ค.', no: 'CZ3609', route: 'กวางโจว CAN T2 → ชิงเต่า TAO', time: '17:00 → 19:55' },
    { leg: 'กลับ 1', date: 'จันทร์ 18 ม.ค.', no: 'CZ3520', route: 'ชิงเต่า TAO → กวางโจว CAN T2', time: '12:20 → 16:00' },
    { leg: 'กลับ 2', date: 'จันทร์ 18 ม.ค.', no: 'CZ6057', route: 'กวางโจว CAN T2 → ภูเก็ต HKT', time: '19:05 → 21:55' },
  ],
  bookingNote: 'เลขการจองดูในแอป Trip.com · กระเป๋าโหลดส่งต่อถึงปลายทาง ไม่ต้องรับที่กวางโจว · ถือขึ้นเครื่อง ≤ 8 กก. · โหลด 1 ใบ ≤ 23 กก.',
  hotels: [
    {
      city: 'กวางโจว · 1 คืน (13→14 ม.ค.)', amapCity: '广州', name: 'Naiya Hotel',
      zh: '奈亚酒店(广州白云国际机场人和地铁站店)',
      address: 'No.27, Shangye 1st Street, Renhe Town, Baiyun District',
      phones: ['+86-20-86030001', '+86-18124264212'],
      note: 'รถรับส่งสนามบินฟรี 24 ชม. (จองล่วงหน้า 1 ชม.)', photo: `${P}/photo-01.webp`,
    },
    {
      city: 'ชิงเต่า · 4 คืน (14→18 ม.ค.)', amapCity: '青岛', name: '12 Shan Yuntang Hotel',
      zh: '十二山·云棠酒店(青岛登州路啤酒博物馆店)', address: '寿光路18号 (Shouguang Road No.18)',
      phones: ['+86-18561709051'],
      note: 'ตึกอิฐแดง 3 ชั้น ป้ายไฟ 云棠酒店 · ใกล้พิพิธภัณฑ์เบียร์', photo: `${P}/photo-02.webp`,
    },
  ],
  emergency: [
    { label: 'Sompo Assist ฉุกเฉิน 24 ชม.', value: '+66 2 119 3000' },
    { label: 'รถพยาบาล (จีน)', value: '120' },
    { label: 'ตำรวจ (จีน)', value: '110' },
    { label: 'ดับเพลิง (จีน)', value: '119' },
  ],
  checklist: [
    'ประกันเดินทาง Sompo Standard',
    'พาสปอร์ต (เหลือ > 6 เดือน) + สำเนา',
    'วีซ่า/บัตรขาเข้าดิจิทัล — ตรวจกฎล่าสุด',
    'ซื้อ + ติดตั้ง eSIM ก่อนออกจากไทย',
    'เงินสด ¥ สำรอง · ลองจ่าย Alipay',
    'พาวเวอร์แบงก์ 3C ในกระเป๋าถือ',
    'จองรถ Trip.com ขาเข้า/ขาออกชิงเต่า',
    'ยืนยันรถรับ Naiya (Trip.com/โทร)',
    'เสื้อหนาว ถุงมือ หมวก รองเท้ากันลื่น แผ่นแปะร้อน',
    'ทิชชู่ เจลล้างมือ หัวแปลงปลั๊ก ยาประจำตัว',
    'ของกินแห้งจากไทยในกระเป๋าถือ (ห้ามมีเนื้อสัตว์)',
    'บันทึกใบจองไว้ออฟไลน์',
  ],
  budget: [
    { item: 'แพ็กเกจ (ตั๋ว CZ 4 เที่ยว + โรงแรมชิงเต่า)', thb: '12,390', status: 'ok' },
    { item: 'Naiya Hotel กวางโจว', thb: '385', status: 'ok' },
    { item: 'พิพิธภัณฑ์เบียร์ + สวนสัตว์ (¥75.5)', thb: '347', status: 'ok' },
    { item: 'รถ/เดินทางในจีน (¥156–253)', thb: '718–1,164', status: 'est' },
    { item: 'อาหาร 5 วัน (¥300–500)', thb: '1,380–2,300', status: 'est' },
    { item: 'ประกันเดินทาง Sompo Standard', thb: '413.64', status: 'ok' },
    { item: 'eSIM (ยังไม่ซื้อ)', thb: '569', status: 'est' },
  ],
  budgetTotal: '16,203–17,569',
  budgetNote: 'ต่อคน · ไม่รวมช้อปปิ้งและเสื้อผ้า · ¥1 ≈ ฿4.6 (จากเล่ม v18)',
}

export default guide
