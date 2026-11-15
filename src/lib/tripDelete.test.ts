import { describe, expect, it } from 'vitest'
import { deleteAllowed } from './tripDelete'

describe('deleteAllowed', () => {
  it.each<[string, string, string, boolean, boolean]>([
    ['throw-away trip, nothing typed', 'test', '', false, true],
    ['real trip, nothing typed', 'ชิงเต่า 青岛', '', true, false],
    ['real trip, wrong name', 'ชิงเต่า 青岛', 'ชิงเต่า', true, false],
    ['real trip, exact name', 'ชิงเต่า 青岛', 'ชิงเต่า 青岛', true, true],
    ['real trip, surrounding spaces ok', 'ชิงเต่า 青岛', '  ชิงเต่า 青岛 ', true, true],
    ['empty name never matches empty typing', '', '', true, false],
  ])('%s', (_n, name, typed, hasGuide, want) => {
    expect(deleteAllowed(name, typed, hasGuide)).toBe(want)
  })
})
