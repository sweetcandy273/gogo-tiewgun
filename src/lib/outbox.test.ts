import { describe, expect, it } from 'vitest'
import { enqueue, flushQueue, isNetworkError, readQueue, type KV } from './outbox'
import type { ExpenseInput } from './types'

function mem(init?: string): KV & { data: Map<string, string> } {
  const data = new Map<string, string>()
  if (init !== undefined) data.set('gogo-outbox', init)
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => { data.set(k, v) } }
}

const exp = (title: string): ExpenseInput => ({
  trip_id: 't1', spent_on: '2027-01-15', category: 'food', title, currency: 'CNY',
  amount: 30, paid_by: 'aum', split: 'half', note: null, settled: false,
})

describe('readQueue', () => {
  it.each([
    ['missing', undefined, 0],
    ['corrupt json', '{oops', 0],
    ['not an array', '{"a":1}', 0],
    ['drops malformed entries', JSON.stringify([{ key: 'k', queuedAt: 1, input: exp('ok') }, { key: 1 }, null]), 1],
  ])('%s', (_n, init, want) => {
    expect(readQueue(mem(init))).toHaveLength(want)
  })
})

describe('isNetworkError', () => {
  it.each([
    [new TypeError('x'), true, true],
    [{ message: 'TypeError: Failed to fetch' }, true, true],
    [{ message: 'Load failed' }, true, true],
    [{ message: 'new row violates check constraint' }, true, false],
    [new Error('anything'), false, true], // offline → always network
  ])('%o online=%s', (e, online, want) => {
    expect(isNetworkError(e, online)).toBe(want)
  })
})

describe('flushQueue', () => {
  it('sends in order and empties the queue', async () => {
    const kv = mem()
    enqueue(kv, exp('a'), 1); enqueue(kv, exp('b'), 2)
    const sent: string[] = []
    const r = await flushQueue(kv, async (i) => { sent.push(i.title) })
    expect(sent).toEqual(['a', 'b'])
    expect(r).toEqual({ sent: 2, dropped: 0, left: 0 })
  })

  it('stops on a network error and keeps the rest', async () => {
    const kv = mem()
    enqueue(kv, exp('a'), 1); enqueue(kv, exp('b'), 2); enqueue(kv, exp('c'), 3)
    let n = 0
    const r = await flushQueue(kv, async () => { if (++n === 2) throw new TypeError('Failed to fetch') })
    expect(r).toEqual({ sent: 1, dropped: 0, left: 2 })
    expect(readQueue(kv).map((p) => p.input.title)).toEqual(['b', 'c'])
  })

  it('drops an item the server rejects', async () => {
    const kv = mem()
    enqueue(kv, exp('bad'), 1); enqueue(kv, exp('good'), 2)
    const r = await flushQueue(kv, async (i) => { if (i.title === 'bad') throw { message: 'violates check constraint' } })
    expect(r).toEqual({ sent: 1, dropped: 1, left: 0 })
  })

  it('keeps items queued while flushing', async () => {
    const kv = mem()
    enqueue(kv, exp('a'), 1)
    await flushQueue(kv, async () => { enqueue(kv, exp('late'), 5) })
    expect(readQueue(kv).map((p) => p.input.title)).toEqual(['late'])
  })
})
