import { describe, expect, it } from 'vitest'
import { settle, toSatang } from './settle'
import type { Expense } from './types'

const base: Omit<Expense, 'id' | 'amount' | 'currency' | 'paid_by' | 'split'> = {
  trip_id: 't1', spent_on: '2027-01-15', category: 'food', title: 'x', note: null,
}
let n = 0
const ex = (p: Partial<Expense>): Expense => ({
  ...base, id: String(++n), amount: 0, currency: 'THB', paid_by: 'aum', split: 'half', ...p,
})

describe('toSatang', () => {
  const cases = [
    { name: 'THB as is', in: { amount: 100.5, currency: 'THB' as const }, rate: 4.6, want: 10050 },
    { name: 'CNY converted', in: { amount: 10, currency: 'CNY' as const }, rate: 4.6, want: 4600 },
    { name: 'CNY rounding', in: { amount: 8.5, currency: 'CNY' as const }, rate: 4.63, want: 3936 }, // 39.355 -> 39.36
    { name: 'negative ignored', in: { amount: -5, currency: 'THB' as const }, rate: 4.6, want: 0 },
    { name: 'NaN ignored', in: { amount: Number.NaN, currency: 'THB' as const }, rate: 4.6, want: 0 },
    { name: 'JPY uses trip rate', in: { amount: 1000, currency: 'JPY' }, rate: 0.2312, want: 23120 },
    { name: 'bad rate ignored for CNY', in: { amount: 10, currency: 'CNY' as const }, rate: 0, want: 0 },
  ]
  for (const c of cases) it(c.name, () => expect(toSatang(c.in, c.rate)).toBe(c.want))
})

describe('settle', () => {
  const cases: { name: string; items: Expense[]; rate: number; want: ReturnType<typeof settle>['transfer']; total: number; unassigned?: number }[] = [
    { name: 'empty', items: [], rate: 4.6, want: null, total: 0 },
    {
      name: 'aum pays shared ฿100 -> tiw owes ฿50',
      items: [ex({ amount: 100, paid_by: 'aum', split: 'half' })], rate: 4.6,
      want: { from: 'tiw', to: 'aum', satang: 5000 }, total: 10000,
    },
    {
      name: 'both pay equal shared -> even',
      items: [ex({ amount: 100, paid_by: 'aum' }), ex({ amount: 100, paid_by: 'tiw' })], rate: 4.6,
      want: null, total: 20000,
    },
    {
      name: 'tiw pays aum-only item -> aum owes full',
      items: [ex({ amount: 80, paid_by: 'tiw', split: 'aum' })], rate: 4.6,
      want: { from: 'aum', to: 'tiw', satang: 8000 }, total: 8000,
    },
    {
      name: 'own item paid by self -> nothing owed',
      items: [ex({ amount: 80, paid_by: 'tiw', split: 'tiw' })], rate: 4.6, want: null, total: 8000,
    },
    {
      name: 'CNY shared ¥20 @4.6 paid by tiw -> aum owes ฿46',
      items: [ex({ amount: 20, currency: 'CNY', paid_by: 'tiw' })], rate: 4.6,
      want: { from: 'aum', to: 'tiw', satang: 4600 }, total: 9200,
    },
    {
      name: 'odd satang stays with payer',
      items: [ex({ amount: 0.01, paid_by: 'aum' })], rate: 4.6, want: null, total: 1,
    },
    {
      name: 'unassigned payer excluded from transfer',
      items: [ex({ amount: 500, paid_by: null }), ex({ amount: 100, paid_by: 'aum' })], rate: 4.6,
      want: { from: 'tiw', to: 'aum', satang: 5000 }, total: 60000, unassigned: 50000,
    },
  ]
  for (const c of cases) {
    it(c.name, () => {
      const got = settle(c.items, c.rate)
      expect(got.transfer).toEqual(c.want)
      expect(got.totalSatang).toBe(c.total)
      expect(got.unassignedSatang).toBe(c.unassigned ?? 0)
      // invariant: shares sum to assigned total
      expect(got.share.aum + got.share.tiw).toBe(got.paid.aum + got.paid.tiw)
    })
  }
})
