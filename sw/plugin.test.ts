import { describe, expect, it } from 'vitest'
import { precacheList, renderServiceWorker } from './plugin'

describe('precacheList', () => {
  it.each([
    ['skips sw.js, maps, dotfiles, redirects', ['index.html', 'sw.js', 'assets/a.js.map', '.DS_Store', '_redirects'], ['/index.html']],
    ['normalizes, dedupes and sorts', ['assets/b.js', 'assets/a.css', 'assets/b.js', 'icons/i.png'], ['/assets/a.css', '/assets/b.js', '/icons/i.png']],
    ['empty', [], []],
  ])('%s', (_name, files, want) => {
    expect(precacheList(files)).toEqual(want)
  })
})

describe('renderServiceWorker', () => {
  const tpl = "const VERSION = '__VERSION__'\nconst PRECACHE = __PRECACHE__\n"

  it('injects version and url list as JSON', () => {
    const out = renderServiceWorker(tpl, 'abcdef0123456789', ['/index.html', "/a'b.js"])
    expect(out).toBe('const VERSION = "abcdef0123456789"\nconst PRECACHE = ["/index.html","/a\'b.js"]\n')
  })

  it.each(['', 'nothex!!', 'ABCDEF12'])('rejects version %j', (v) => {
    expect(() => renderServiceWorker(tpl, v, [])).toThrow()
  })
})
