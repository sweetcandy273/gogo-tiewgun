import { describe, expect, it } from 'vitest'
import { amapSearchUrl } from './amap'

describe('amapSearchUrl', () => {
  const cases = [
    { name: 'with city', kw: '青岛动物园', city: '青岛', want: 'https://uri.amap.com/search?keyword=%E9%9D%92%E5%B2%9B%E5%8A%A8%E7%89%A9%E5%9B%AD&src=gogo-tiewgun&callnative=1&city=%E9%9D%92%E5%B2%9B' },
    { name: 'no city', kw: '人和', city: '', want: 'https://uri.amap.com/search?keyword=%E4%BA%BA%E5%92%8C&src=gogo-tiewgun&callnative=1' },
    { name: 'trims and encodes symbols', kw: ' 寿光路18号&x ', city: '', want: 'https://uri.amap.com/search?keyword=%E5%AF%BF%E5%85%89%E8%B7%AF18%E5%8F%B7%26x&src=gogo-tiewgun&callnative=1' },
  ]
  for (const c of cases) it(c.name, () => expect(amapSearchUrl(c.kw, c.city)).toBe(c.want))
})
