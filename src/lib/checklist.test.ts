import { describe, expect, it } from 'vitest'
import { cleanLabel, guideKey, legacyToRows, mergeChecklist } from './checklist'
import type { CheckItem } from './types'

const row = (k: string, done: boolean, extra: Partial<CheckItem> = {}): CheckItem =>
  ({ trip_id: 't', item_key: k, label: null, done, done_by: done ? 'aum' : null, ...extra })

describe('mergeChecklist', () => {
  const guide = ['พาสปอร์ต', 'eSIM']

  it('keeps guide order and applies ticks', () => {
    const out = mergeChecklist(guide, [row(guideKey('eSIM'), true)])
    expect(out.map((r) => [r.label, r.done, r.doneBy, r.custom])).toEqual([
      ['พาสปอร์ต', false, null, false],
      ['eSIM', true, 'aum', false],
    ])
  })

  it('appends own items oldest first, skips blanks and stale guide keys', () => {
    const out = mergeChecklist(guide, [
      row('c:2', false, { label: 'ร่ม', created_at: '2026-11-02' }),
      row('c:1', true, { label: ' ยาดม ', created_at: '2026-11-01', done_by: 'tiw' }),
      row('c:3', false, { label: '   ' }),
      row(guideKey('removed item'), true),
    ])
    expect(out.slice(2).map((r) => [r.key, r.label, r.done, r.doneBy])).toEqual([
      ['c:1', 'ยาดม', true, 'tiw'],
      ['c:2', 'ร่ม', false, null],
    ])
    expect(out).toHaveLength(4)
  })

  it('hides done_by when not done', () => {
    expect(mergeChecklist(['a'], [row(guideKey('a'), false, { done_by: 'tiw' })])[0].doneBy).toBeNull()
  })
})

describe('cleanLabel', () => {
  it.each([
    ['  ร่ม  พับ ', 'ร่ม พับ'],
    ['   ', null],
    ['', null],
    ['x'.repeat(250), 'x'.repeat(200)],
  ])('%j', (input, want) => {
    expect(cleanLabel(input)).toBe(want)
  })
})

describe('legacyToRows', () => {
  const guide = ['a', 'b', 'c']
  it.each([
    ['null', null, []],
    ['array', ['a'], []],
    ['ticked guide items only', { a: true, b: false, zzz: true }, ['g:a']],
    ['skips keys already shared', { a: true, c: true }, ['g:c']],
  ])('%s', (_n, legacy, want) => {
    const rows = legacyToRows('t', legacy, guide, [row('g:a', false)].filter(() => _n === 'skips keys already shared'), 'tiw')
    expect(rows.map((r) => r.item_key)).toEqual(want)
    rows.forEach((r) => expect(r).toMatchObject({ trip_id: 't', done: true, done_by: 'tiw', label: null }))
  })
})
