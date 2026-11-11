import { describe, expect, it } from 'vitest'
import { buildTimeline, clockOverride, formatMins, nowState, parseStart, type TimedDay } from './now'

const iso = (ms: number) => new Date(ms).toISOString()

describe('parseStart', () => {
  it.each([
    ['17:25', { h: 17, m: 25 }],
    ['~23:30–00:00', { h: 23, m: 30 }],
    ['→ 07:00', { h: 7, m: 0 }],
    ['8:40', { h: 8, m: 40 }],
    ['ช่วงบ่าย', null],
    ['25:00', null],
    ['', null],
  ])('%s', (input, want) => {
    expect(parseStart(input)).toEqual(want)
  })
})

const days: TimedDay[] = [
  { date: '2027-01-13', items: [{ time: '~14:30', tz: '+07:00' }, { time: '17:25', tz: '+07:00' }, { time: '~23:30' }, { time: '→ 07:00' }] },
  { date: '2027-01-14', items: [{ time: '07:30' }, { time: 'no time' }, { time: '11:05' }] },
  { items: [{ time: '09:00' }] }, // no date → skipped
]

describe('buildTimeline', () => {
  const tl = buildTimeline(days)

  it('uses per-item tz and rolls over midnight', () => {
    expect(tl.map((p) => iso(p.at))).toEqual([
      '2027-01-13T07:30:00.000Z', // 14:30 +07
      '2027-01-13T10:25:00.000Z', // 17:25 +07
      '2027-01-13T15:30:00.000Z', // 23:30 +08
      '2027-01-13T23:00:00.000Z', // 07:00 next day +08
      '2027-01-13T23:30:00.000Z', // 07:30 +08 on the 14th
      '2027-01-14T03:05:00.000Z',
    ])
  })

  it('keeps day/item indexes (skipping untimed items)', () => {
    expect(tl.map((p) => [p.day, p.item])).toEqual([[0, 0], [0, 1], [0, 2], [0, 3], [1, 0], [1, 2]])
  })

  it('ignores a bad tz', () => {
    expect(buildTimeline([{ date: '2027-01-13', tz: 'bad', items: [{ time: '10:00' }] }])).toEqual([])
  })
})

describe('nowState', () => {
  const tl = buildTimeline(days)
  const at = (s: string) => Date.parse(s)
  type Want = { kind: string; item?: number[]; current?: number[]; next?: number[] | null; mins?: number | null }

  it.each<[string, string, Want]>([
    ['before the trip', '2027-01-01T00:00:00+07:00', { kind: 'before', item: [0, 0], mins: 18150 }],
    ['exactly on an item', '2027-01-13T17:25:00+07:00', { kind: 'during', current: [0, 1], next: [0, 2], mins: 305 }],
    ['between items', '2027-01-14T09:00:00+08:00', { kind: 'during', current: [1, 0], next: [1, 2], mins: 125 }],
    ['last item, within tail', '2027-01-14T13:00:00+08:00', { kind: 'during', current: [1, 2], next: null, mins: null }],
    ['after the tail', '2027-01-14T16:00:00+08:00', { kind: 'after' }],
  ])('%s', (_name, now, want) => {
    const s = nowState(tl, at(now))
    expect(s?.kind).toBe(want.kind)
    if (s?.kind === 'before') {
      expect([s.next.day, s.next.item]).toEqual(want.item)
      expect(s.minsToNext).toBe(want.mins)
    }
    if (s?.kind === 'during') {
      expect([s.current.day, s.current.item]).toEqual(want.current)
      expect(s.next ? [s.next.day, s.next.item] : null).toEqual(want.next)
      expect(s.minsToNext).toBe(want.mins)
    }
  })

  it('returns null for an empty plan or bad clock', () => {
    expect(nowState([], Date.now())).toBeNull()
    expect(nowState(tl, Number.NaN)).toBeNull()
  })
})

describe('formatMins', () => {
  it.each([[0, 'ตอนนี้'], [5, '5 นาที'], [60, '1 ชม.'], [125, '2 ชม. 5 นาที'], [-3, 'ตอนนี้']])('%i', (m, want) => {
    expect(formatMins(m)).toBe(want)
  })
})

describe('clockOverride', () => {
  it.each([
    ['?now=2027-01-14T10:30:00%2B08:00', Date.parse('2027-01-14T10:30:00+08:00')],
    ['?now=nonsense', null],
    ['', null],
  ])('%s', (q, want) => {
    expect(clockOverride(q)).toBe(want)
  })
})
