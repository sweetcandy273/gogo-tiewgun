import { describe, expect, it } from 'vitest'
import { clothesMoney, settle, toSatang } from './settle'
import type { Cloth, Expense } from './types'

let n = 0
const ex = (p: Partial<Expense>): Expense => ({
  id: String(++n), trip_id: 't1', spent_on: '2027-01-15', category: 'food', title: 'x', note: null,
  amount: 0, currency: 'THB', paid_by: 'aum', split: 'half', settled: false, ...p,
})
const cl = (p: Partial<Cloth>): Cloth => ({
  id: String(++n), trip_id: 't1', owner: 'tiw', name: 'x', kind: 'top', photo_url: null, photo_path: null, note: null,
  price: 100, paid_by: 'aum', settled: false, ...p,
})

describe('toSatang', () => {
  const cases = [
    { name: 'THB as is', in: { amount: 100.5, currency: 'THB' }, rate: 4.6, want: 10050 },
    { name: 'CNY converted', in: { amount: 10, currency: 'CNY' }, rate: 4.6, want: 4600 },
    { name: 'CNY rounding', in: { amount: 8.5, currency: 'CNY' }, rate: 4.63, want: 3936 },
    { name: 'JPY uses trip rate', in: { amount: 1000, currency: 'JPY' }, rate: 0.2312, want: 23120 },
    { name: 'negative ignored', in: { amount: -5, currency: 'THB' }, rate: 4.6, want: 0 },
    { name: 'NaN ignored', in: { amount: Number.NaN, currency: 'THB' }, rate: 4.6, want: 0 },
    { name: 'bad rate ignored for CNY', in: { amount: 10, currency: 'CNY' }, rate: 0, want: 0 },
  ]
  for (const c of cases) it(c.name, () => expect(toSatang(c.in, c.rate)).toBe(c.want))
})

describe('settle (trip expenses)', () => {
  const cases: { name: string; items: Expense[]; want: ReturnType<typeof settle>['transfer']; total: number; unassigned?: number; settled?: number }[] = [
    { name: 'empty', items: [], want: null, total: 0 },
    { name: 'aum pays shared ฿100 -> tiw owes ฿50', items: [ex({ amount: 100 })], want: { from: 'tiw', to: 'aum', satang: 5000 }, total: 10000 },
    { name: 'both pay equal shared -> even', items: [ex({ amount: 100 }), ex({ amount: 100, paid_by: 'tiw' })], want: null, total: 20000 },
    { name: 'tiw pays aum-only item -> aum owes full', items: [ex({ amount: 80, paid_by: 'tiw', split: 'aum' })], want: { from: 'aum', to: 'tiw', satang: 8000 }, total: 8000 },
    { name: 'own item paid by self -> nothing owed', items: [ex({ amount: 80, paid_by: 'tiw', split: 'tiw' })], want: null, total: 8000 },
    { name: 'CNY ¥20 @4.6 paid by tiw -> aum owes ฿46', items: [ex({ amount: 20, currency: 'CNY', paid_by: 'tiw' })], want: { from: 'aum', to: 'tiw', satang: 4600 }, total: 9200 },
    { name: 'odd satang stays with payer', items: [ex({ amount: 0.01 })], want: null, total: 1 },
    { name: 'unassigned payer excluded', items: [ex({ amount: 500, paid_by: null }), ex({ amount: 100 })], want: { from: 'tiw', to: 'aum', satang: 5000 }, total: 60000, unassigned: 50000 },
    {
      name: 'settled (ticked) item counted in total but not owed',
      items: [ex({ amount: 24780, settled: true }), ex({ amount: 100 })],
      want: { from: 'tiw', to: 'aum', satang: 5000 }, total: 2488000, settled: 2478000,
    },
    { name: 'everything settled -> nothing owed', items: [ex({ amount: 100, settled: true })], want: null, total: 10000, settled: 10000 },
  ]
  for (const c of cases) {
    it(c.name, () => {
      const got = settle(c.items, 4.6)
      expect(got.transfer).toEqual(c.want)
      expect(got.totalSatang).toBe(c.total)
      expect(got.unassignedSatang).toBe(c.unassigned ?? 0)
      expect(got.settledSatang).toBe(c.settled ?? 0)
      expect(got.share.aum + got.share.tiw).toBe(got.paid.aum + got.paid.tiw)
    })
  }
})

describe('already transferred (settled) amounts', () => {
  const cases = [
    { name: 'settled shared item: only the half that was owed', items: [ex({ amount: 770.19, settled: true })], want: { from: 'tiw', to: 'aum', satang: 38509 } },
    { name: 'settled tiw-only item paid by aum: full amount', items: [ex({ amount: 300, split: 'tiw', settled: true })], want: { from: 'tiw', to: 'aum', satang: 30000 } },
    { name: 'settled own item: nothing transferred', items: [ex({ amount: 300, split: 'aum', settled: true })], want: null },
    { name: 'unsettled items do not count', items: [ex({ amount: 100 })], want: null },
  ]
  for (const c of cases) it(c.name, () => expect(settle(c.items, 4.6).settledTransfer).toEqual(c.want))
  it('clothes: settled price counts as transferred', () => {
    const got = clothesMoney([cl({ price: 310, settled: true }), cl({ price: 360 })])
    expect(got.settledTransfer).toEqual({ from: 'tiw', to: 'aum', satang: 31000 })
    expect(got.transfer).toEqual({ from: 'tiw', to: 'aum', satang: 36000 })
  })
})

describe('clothesMoney', () => {
  const cases: { name: string; items: Cloth[]; want: ReturnType<typeof clothesMoney>['transfer']; total: number; billable: number }[] = [
    { name: 'aum bought tiw item -> tiw owes', items: [cl({ price: 360 })], want: { from: 'tiw', to: 'aum', satang: 36000 }, total: 36000, billable: 1 },
    { name: "aum's own item -> nothing owed", items: [cl({ owner: 'aum', price: 233.31 })], want: null, total: 23331, billable: 0 },
    { name: 'settled item not owed', items: [cl({ price: 100, settled: true }), cl({ price: 50 })], want: { from: 'tiw', to: 'aum', satang: 5000 }, total: 15000, billable: 2 },
    { name: 'owner not set -> not billed', items: [cl({ owner: null, price: 96.7 })], want: null, total: 9670, billable: 0 },
    { name: 'no price -> ignored', items: [cl({ price: null })], want: null, total: 0, billable: 0 },
    { name: 'tiw bought aum item -> aum owes', items: [cl({ owner: 'aum', paid_by: 'tiw', price: 120 })], want: { from: 'aum', to: 'tiw', satang: 12000 }, total: 12000, billable: 1 },
    { name: 'nets both directions', items: [cl({ price: 300 }), cl({ owner: 'aum', paid_by: 'tiw', price: 120 })], want: { from: 'tiw', to: 'aum', satang: 18000 }, total: 42000, billable: 2 },
  ]
  for (const c of cases) {
    it(c.name, () => {
      const got = clothesMoney(c.items)
      expect(got.transfer).toEqual(c.want)
      expect(got.totalSatang).toBe(c.total)
      expect(got.billable).toHaveLength(c.billable)
    })
  }
})
