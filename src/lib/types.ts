export type Person = 'aum' | 'tiw'
export type Split = 'half' | Person
export type Category = 'booking' | 'transport' | 'food' | 'ticket' | 'shopping' | 'other'

export interface Trip {
  id: string
  slug: string
  name: string
  start_date: string | null
  end_date: string | null
  currency: string // local currency, ISO 4217
  rate_to_thb: number
}
export type TripInput = Omit<Trip, 'id'>

export interface Expense {
  id: string
  trip_id: string
  spent_on: string // YYYY-MM-DD
  category: Category
  title: string
  currency: string // 'THB' or the trip's local currency
  amount: number
  paid_by: Person | null
  split: Split
  note: string | null
  /** true = cleared between the two (paid back) — no longer counted as owed */
  settled: boolean
  created_at?: string
  updated_at?: string
}
export type ExpenseInput = Omit<Expense, 'id' | 'created_at' | 'updated_at'>

export const PEOPLE: Record<Person, string> = { aum: 'อุ้ม', tiw: 'ทิว' }

export const CATEGORIES: Record<Category, { label: string; color: string }> = {
  booking: { label: 'ตั๋ว/ที่พัก', color: '#1B4965' },
  transport: { label: 'เดินทาง', color: '#2F7FB3' },
  food: { label: 'อาหาร/เครื่องดื่ม', color: '#B5533C' },
  ticket: { label: 'ค่าเข้าชม', color: '#7A8B3C' },
  shopping: { label: 'ช้อปปิ้ง/ของฝาก', color: '#A07A4F' },
  other: { label: 'อื่น ๆ', color: '#5B6B78' },
}

export const SPLITS: Record<Split, string> = {
  half: 'หาร 2',
  aum: 'ของอุ้มคนเดียว',
  tiw: 'ของทิวคนเดียว',
}

export const CURRENCIES: Record<string, { symbol: string; name: string }> = {
  THB: { symbol: '฿', name: 'บาท' },
  CNY: { symbol: '¥', name: 'หยวน' },
  JPY: { symbol: '¥', name: 'เยน' },
  KRW: { symbol: '₩', name: 'วอน' },
  TWD: { symbol: 'NT$', name: 'ดอลลาร์ไต้หวัน' },
  HKD: { symbol: 'HK$', name: 'ดอลลาร์ฮ่องกง' },
  SGD: { symbol: 'S$', name: 'ดอลลาร์สิงคโปร์' },
  VND: { symbol: '₫', name: 'ดอง' },
  USD: { symbol: '$', name: 'ดอลลาร์สหรัฐ' },
  EUR: { symbol: '€', name: 'ยูโร' },
  GBP: { symbol: '£', name: 'ปอนด์' },
}
export const sym = (c: string) => CURRENCIES[c]?.symbol ?? c + ' '

export type ClothKind = 'inner' | 'top' | 'outer' | 'bottom' | 'shoes' | 'accessory'

export interface Cloth {
  id: string
  trip_id: string
  owner: Person | null
  name: string
  kind: ClothKind
  photo_url: string | null
  photo_path: string | null
  note: string | null
  /** THB incl. shipping; null = not entered */
  price: number | null
  /** who paid for it (default aum) */
  paid_by: Person
  /** owner paid the payer back */
  settled: boolean
}
export type ClothInput = Omit<Cloth, 'id'>

export interface OutfitPick {
  trip_id: string
  day: string // YYYY-MM-DD
  cloth_id: string
}

export const KINDS: Record<ClothKind, { label: string; emoji: string }> = {
  outer: { label: 'ตัวนอก', emoji: '🧥' },
  top: { label: 'เสื้อ', emoji: '👕' },
  inner: { label: 'ชั้นใน/ฮีท', emoji: '🧦' },
  bottom: { label: 'กางเกง/ล่าง', emoji: '👖' },
  shoes: { label: 'รองเท้า', emoji: '👟' },
  accessory: { label: 'ของใช้/อื่น ๆ', emoji: '🧣' },
}

/** One shared checklist tick (guide items use key "g:<text>", own items "c:<uuid>" with a label) */
export interface CheckItem {
  trip_id: string
  item_key: string
  label: string | null
  done: boolean
  done_by: Person | null
  created_at?: string
}
