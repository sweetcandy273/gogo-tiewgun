import { describe, expect, it } from 'vitest'
import { daysByCloth, outfitFor, tripDays, wardrobeStats } from './wardrobe'
import type { Cloth, OutfitPick } from './types'

const c = (id: string, owner: Cloth['owner'], kind: Cloth['kind']): Cloth => ({
  id, trip_id: 't', owner, name: id, kind, photo_url: null, photo_path: null, note: null, price: null, paid_by: 'aum', settled: false,
})
const p = (day: string, cloth_id: string): OutfitPick => ({ trip_id: 't', day, cloth_id })

describe('tripDays', () => {
  const cases = [
    { name: 'normal range', s: '2027-01-13', e: '2027-01-15', want: ['2027-01-13', '2027-01-14', '2027-01-15'] },
    { name: 'single day', s: '2027-01-13', e: '2027-01-13', want: ['2027-01-13'] },
    { name: 'crosses month', s: '2027-01-31', e: '2027-02-01', want: ['2027-01-31', '2027-02-01'] },
    { name: 'end before start', s: '2027-01-15', e: '2027-01-13', want: [] },
    { name: 'missing end', s: '2027-01-15', e: null, want: [] },
    { name: 'bad format', s: '15/01/2027', e: '2027-01-16', want: [] },
  ]
  for (const t of cases) it(t.name, () => expect(tripDays(t.s, t.e)).toEqual(t.want))
  it('caps at 60 days', () => expect(tripDays('2027-01-01', '2027-12-31')).toHaveLength(60))
})

describe('wardrobe', () => {
  const clothes = [c('a1', 'aum', 'top'), c('a2', 'aum', 'bottom'), c('t1', 'tiw', 'outer'), c('x', null, 'top')]
  const picks = [p('2027-01-15', 'a1'), p('2027-01-15', 'a2'), p('2027-01-15', 't1'), p('2027-01-16', 'a1')]

  it('stats', () => {
    expect(wardrobeStats(clothes, picks)).toEqual({
      total: 4, byOwner: { aum: 2, tiw: 1, none: 1 }, byKind: { top: 2, bottom: 1, outer: 1 }, unused: 1,
    })
  })
  it('days by cloth sorted', () => {
    const m = daysByCloth([p('2027-01-16', 'a1'), p('2027-01-15', 'a1')])
    expect(m.get('a1')).toEqual(['2027-01-15', '2027-01-16'])
  })
  const cases = [
    { name: 'aum on 15th, outer-first order', day: '2027-01-15', owner: 'aum' as const, want: ['a1', 'a2'] },
    { name: 'everyone on 15th', day: '2027-01-15', owner: null, want: ['t1', 'a1', 'a2'] },
    { name: 'tiw on 16th', day: '2027-01-16', owner: 'tiw' as const, want: [] },
  ]
  for (const t of cases) it(t.name, () => expect(outfitFor(t.day, t.owner, clothes, picks).map((x) => x.id)).toEqual(t.want))
})
