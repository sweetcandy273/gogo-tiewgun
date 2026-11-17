import { describe, expect, it } from 'vitest'
import guide from './index'

// DayView calls .length / .map on these, so a missing array blanks the whole page.
describe('qingdao guide shape', () => {
  it('has days', () => {
    expect(guide.days.length).toBeGreaterThan(0)
  })

  it.each(guide.days.map((d, i) => [i, d.title, d] as const))('day %i (%s) has every array the day page reads', (_i, _t, d) => {
    expect(Array.isArray(d.items)).toBe(true)
    expect(Array.isArray(d.cards)).toBe(true)
    expect(Array.isArray(d.photos)).toBe(true)
    for (const it of d.items) {
      expect(typeof it.time).toBe('string')
      expect(typeof it.title).toBe('string')
      expect(Array.isArray(it.zh)).toBe(true)
      expect(Array.isArray(it.tags)).toBe(true)
    }
  })
})
