import { BOOKING_KINDS, type Booking, type BookingInput, type BookingKind } from './types'

/** Pure helpers + per-device storage for the booking vault (the server does the real checking). */

export const CODE_RE = /^\d{6}$/

export interface VaultKV { getItem(k: string): string | null; setItem(k: string, v: string): void; removeItem(k: string): void }
export interface StoredToken { token: string; expires_at: string }

export type UnlockResult =
  | { ok: true; token: string; expires_at: string }
  | { ok: false; reason: 'wrong'; remaining: number }
  | { ok: false; reason: 'locked'; retry_after: number }
  | { ok: false; reason: 'not_set' | 'bad_format' }

const tokenKey = (slug: string) => `gogo-vault-${slug}`
const cacheKey = (slug: string) => `gogo-vault-cache-${slug}`

export function readToken(kv: VaultKV, slug: string, now = Date.now()): StoredToken | null {
  try {
    const v = JSON.parse(kv.getItem(tokenKey(slug)) ?? 'null') as Partial<StoredToken> | null
    if (!v || typeof v.token !== 'string' || !/^[0-9a-f]{64}$/.test(v.token) || typeof v.expires_at !== 'string') return null
    const exp = Date.parse(v.expires_at)
    return Number.isFinite(exp) && exp > now ? { token: v.token, expires_at: v.expires_at } : null
  } catch { return null }
}

export function writeToken(kv: VaultKV, slug: string, t: StoredToken): boolean {
  try { kv.setItem(tokenKey(slug), JSON.stringify(t)); return true } catch { return false }
}

/** forget this device: token and the offline copy of the bookings */
export function clearVault(kv: VaultKV, slug: string): void {
  try { kv.removeItem(tokenKey(slug)) } catch { /* ignore */ }
  try { kv.removeItem(cacheKey(slug)) } catch { /* ignore */ }
}

export interface CachedBookings { savedAt: number; items: Booking[] }

export function writeCache(kv: VaultKV, slug: string, items: Booking[], now = Date.now()): void {
  try { kv.setItem(cacheKey(slug), JSON.stringify({ savedAt: now, items } satisfies CachedBookings)) } catch { /* full / blocked */ }
}

export function readCache(kv: VaultKV, slug: string): CachedBookings | null {
  try {
    const v = JSON.parse(kv.getItem(cacheKey(slug)) ?? 'null') as Partial<CachedBookings> | null
    return v && typeof v.savedAt === 'number' && Array.isArray(v.items) ? { savedAt: v.savedAt, items: v.items } : null
  } catch { return null }
}

const KIND_ORDER = Object.keys(BOOKING_KINDS) as BookingKind[]

/** by date (undated last), then kind, then title */
export function sortBookings(list: Booking[]): Booking[] {
  return [...list].sort((a, b) =>
    (a.on_date ?? '9999').localeCompare(b.on_date ?? '9999')
    || KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind)
    || a.title.localeCompare(b.title))
}

export function groupByKind(list: Booking[]): { kind: BookingKind; items: Booking[] }[] {
  return KIND_ORDER.map((kind) => ({ kind, items: sortBookings(list.filter((b) => b.kind === kind)) })).filter((g) => g.items.length)
}

const MONTHS = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']

/** '2027-01-13' → '13 ม.ค. 2027' (no Date object, so no timezone shifts) */
export function formatDate(iso: string | null): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? '')
  if (!m) return ''
  const mon = Number(m[2])
  return mon >= 1 && mon <= 12 ? `${Number(m[3])} ${MONTHS[mon - 1]} ${m[1]}` : ''
}

export function formatWait(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds))
  if (s < 60) return `${s} วินาที`
  const m = Math.ceil(s / 60)
  if (m < 60) return `${m} นาที`
  const h = Math.floor(m / 60)
  const rest = m % 60
  return rest ? `${h} ชม. ${rest} นาที` : `${h} ชม.`
}

export function failureMessage(r: Exclude<UnlockResult, { ok: true }>): string {
  switch (r.reason) {
    case 'wrong': return `รหัสไม่ถูกต้อง (เหลือ ${r.remaining} ครั้งก่อนถูกล็อก)`
    case 'locked': return `ใส่ผิดหลายครั้ง ถูกล็อกชั่วคราว รออีก ${formatWait(r.retry_after)}`
    case 'bad_format': return 'รหัสเป็นตัวเลข 6 หลัก'
    case 'not_set': return 'ยังไม่ได้ตั้งรหัส (รัน SQL 008 และ vault_set_code ใน Supabase ก่อน)'
  }
}

export const VAULT_LIMITS = { title: 200, ref: 200, details: 4000 } as const

/** Validate + trim the form. Returns the cleaned input or Thai error messages. */
export function cleanBooking(f: {
  id?: string; kind: BookingKind; title: string; ref: string; on_date: string; details: string
}): { ok: true; input: BookingInput } | { ok: false; errors: string[] } {
  const errors: string[] = []
  const title = f.title.trim()
  const ref = f.ref.trim()
  const details = f.details.trim()
  if (!title) errors.push('ใส่ชื่อรายการ')
  if (title.length > VAULT_LIMITS.title) errors.push('ชื่อรายการยาวเกินไป')
  if (ref.length > VAULT_LIMITS.ref) errors.push('เลขจองยาวเกินไป')
  if (details.length > VAULT_LIMITS.details) errors.push('รายละเอียดยาวเกินไป')
  if (!(f.kind in BOOKING_KINDS)) errors.push('เลือกหมวด')
  if (f.on_date && !/^\d{4}-\d{2}-\d{2}$/.test(f.on_date)) errors.push('วันที่ไม่ถูกต้อง')
  if (errors.length) return { ok: false, errors }
  return { ok: true, input: { id: f.id, kind: f.kind, title, ref: ref || null, on_date: f.on_date || null, details: details || null } }
}
