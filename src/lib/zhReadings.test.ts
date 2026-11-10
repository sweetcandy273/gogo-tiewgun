import { describe, expect, it } from 'vitest'
import { readingOf, registerReadings, withReadings } from './zhReadings'

registerReadings({ '青岛动物园': 'ชิงเต่าต้งอู้หยวน', '栈桥': 'จ้านเฉียว', 'x<y': 'a"b' })

describe('withReadings', () => {
  const cases = [
    { name: 'adds reading after chip', in: '<b>ไป</b> <span class="zh">栈桥</span>', want: '<b>ไป</b> <span class="zh">栈桥</span><span class="zh-th">จ้านเฉียว</span>' },
    { name: 'unknown term untouched', in: '<span class="zh">台东</span>', want: '<span class="zh">台东</span>' },
    { name: 'several chips', in: '<span class="zh">栈桥</span> · <span class="zh">青岛动物园</span>', want: '<span class="zh">栈桥</span><span class="zh-th">จ้านเฉียว</span> · <span class="zh">青岛动物园</span><span class="zh-th">ชิงเต่าต้งอู้หยวน</span>' },
    { name: 'no chips', in: 'plain text', want: 'plain text' },
  ]
  for (const c of cases) it(c.name, () => expect(withReadings(c.in)).toBe(c.want))
  it('escapes reading text', () => {
    expect(withReadings('<span class="zh">x&lt;y</span>')).toBe('<span class="zh">x&lt;y</span>')
    expect(readingOf(' 栈桥 ')).toBe('จ้านเฉียว')
  })
})
