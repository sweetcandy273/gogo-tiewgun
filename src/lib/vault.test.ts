import { describe, expect, it } from 'vitest'
import type { Booking } from './types'
import {
  CODE_RE, cleanBooking, clearVault, failureMessage, formatDate, formatWait, groupByKind,
  readCache, readToken, sortBookings, writeCache, writeToken, type VaultKV,
} from './vault'

function mem(): VaultKV & { data: Map<string, string> } {
  const data = new Map<string, string>()
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v) }, removeItem: (k) => { data.delete(k) } }
}

const TOKEN = 'a'.repeat(64)
const NOW = Date.parse('2026-11-14T00:00:00Z')
const YEAR = '2027-11-14T00:00:00Z'

describe('CODE_RE', () => {
  it.each([['123456', true], ['000000', true], ['1234', false], ['12345', false], ['1234567', false], ['12a456', false], ['', false], [' 123456', false]])('%j', (v, want) => {
    expect(CODE_RE.test(v)).toBe(want)
  })
})

describe('token storage', () => {
  it.each<[string, string | null, boolean]>([
    ['valid', JSON.stringify({ token: TOKEN, expires_at: YEAR }), true],
    ['expired', JSON.stringify({ token: TOKEN, expires_at: '2026-01-01T00:00:00Z' }), false],
    ['not 64 hex', JSON.stringify({ token: 'abc', expires_at: YEAR }), false],
    ['bad date', JSON.stringify({ token: TOKEN, expires_at: 'soon' }), false],
    ['corrupt json', '{nope', false],
    ['missing', null, false],
  ])('%s', (_n, raw, want) => {
    const kv = mem()
    if (raw !== null) kv.data.set('gogo-vault-t', raw)
    expect(readToken(kv, 't', NOW) !== null).toBe(want)
  })

  it('round-trips and clearVault also drops the offline copy', () => {
    const kv = mem()
    expect(writeToken(kv, 't', { token: TOKEN, expires_at: YEAR })).toBe(true)
    writeCache(kv, 't', [], NOW)
    expect(readToken(kv, 't', NOW)?.token).toBe(TOKEN)
    clearVault(kv, 't')
    expect(readToken(kv, 't', NOW)).toBeNull()
    expect(readCache(kv, 't')).toBeNull()
  })

  it('survives a storage that throws', () => {
    const bad: VaultKV = { getItem: () => { throw new Error('x') }, setItem: () => { throw new Error('x') }, removeItem: () => { throw new Error('x') } }
    expect(readToken(bad, 't')).toBeNull()
    expect(writeToken(bad, 't', { token: TOKEN, expires_at: YEAR })).toBe(false)
    expect(() => clearVault(bad, 't')).not.toThrow()
    expect(() => writeCache(bad, 't', [])).not.toThrow()
  })

  it('tokens are kept per trip', () => {
    const kv = mem()
    writeToken(kv, 'a', { token: TOKEN, expires_at: YEAR })
    expect(readToken(kv, 'b', NOW)).toBeNull()
  })
})

describe('offline cache', () => {
  it.each([['corrupt', '{x', null], ['wrong shape', '{"items":1}', null]])('%s', (_n, raw, want) => {
    const kv = mem()
    kv.data.set('gogo-vault-cache-t', raw)
    expect(readCache(kv, 't')).toBe(want)
  })
})

const b = (id: string, kind: Booking['kind'], title: string, on_date: string | null): Booking =>
  ({ id, trip_id: 't', kind, title, ref: null, on_date, details: null })

describe('sortBookings / groupByKind', () => {
  const list = [b('1', 'hotel', 'Z hotel', null), b('2', 'flight', 'B', '2027-01-14'), b('3', 'hotel', 'A hotel', '2027-01-13'), b('4', 'flight', 'A', '2027-01-14')]

  it('sorts by date (undated last), kind, title', () => {
    expect(sortBookings(list).map((x) => x.id)).toEqual(['3', '4', '2', '1'])
  })
  it('does not mutate the input', () => {
    const copy = [...list]
    sortBookings(list)
    expect(list).toEqual(copy)
  })
  it('groups in kind order and skips empty kinds', () => {
    expect(groupByKind(list).map((g) => [g.kind, g.items.map((x) => x.id)])).toEqual([['flight', ['4', '2']], ['hotel', ['3', '1']]])
  })
})

describe('formatDate', () => {
  it.each([['2027-01-13', '13 ม.ค. 2027'], ['2027-12-01', '1 ธ.ค. 2027'], ['2027-13-01', ''], ['nope', ''], [null, '']])('%s', (v, want) => {
    expect(formatDate(v)).toBe(want)
  })
})

describe('formatWait', () => {
  it.each([[0, '0 วินาที'], [30, '30 วินาที'], [61, '2 นาที'], [900, '15 นาที'], [3600, '1 ชม.'], [5400, '1 ชม. 30 นาที'], [-5, '0 วินาที']])('%i', (s, want) => {
    expect(formatWait(s)).toBe(want)
  })
})

describe('failureMessage', () => {
  it('mentions what is left or how long to wait', () => {
    expect(failureMessage({ ok: false, reason: 'wrong', remaining: 3 })).toContain('เหลือ 3 ครั้ง')
    expect(failureMessage({ ok: false, reason: 'locked', retry_after: 900 })).toContain('15 นาที')
    expect(failureMessage({ ok: false, reason: 'not_set' })).toContain('SQL 008')
    expect(failureMessage({ ok: false, reason: 'bad_format' })).toContain('6 หลัก')
  })
})

describe('cleanBooking', () => {
  const base = { kind: 'hotel' as const, title: ' Hotel ', ref: ' ABC123 ', on_date: '2027-01-13', details: ' note ' }

  it('trims and nulls empty optionals', () => {
    expect(cleanBooking({ ...base, ref: ' ', details: '', on_date: '' })).toEqual({
      ok: true, input: { id: undefined, kind: 'hotel', title: 'Hotel', ref: null, on_date: null, details: null },
    })
    const r = cleanBooking(base)
    expect(r.ok && r.input).toMatchObject({ title: 'Hotel', ref: 'ABC123', details: 'note' })
  })

  it.each<[string, Partial<typeof base>, string]>([
    ['empty title', { title: '  ' }, 'ใส่ชื่อรายการ'],
    ['long title', { title: 'x'.repeat(201) }, 'ชื่อรายการยาวเกินไป'],
    ['long ref', { ref: 'x'.repeat(201) }, 'เลขจองยาวเกินไป'],
    ['long details', { details: 'x'.repeat(4001) }, 'โน้ตยาวเกินไป'],
    ['bad date', { on_date: '13/01/2027' }, 'วันที่ไม่ถูกต้อง'],
    ['bad kind', { kind: 'spaceship' as never }, 'เลือกหมวด'],
  ])('%s', (_n, patch, msg) => {
    const r = cleanBooking({ ...base, ...patch })
    expect(r.ok).toBe(false)
    if (!r.ok) expect(r.errors).toContain(msg)
  })

  it('keeps the id when editing', () => {
    const r = cleanBooking({ ...base, id: 'abc' })
    expect(r.ok && r.input.id).toBe('abc')
  })
})
