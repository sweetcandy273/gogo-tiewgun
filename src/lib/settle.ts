import type { Category, Expense, Person } from './types'

/** Money is handled in satang (integer) to avoid floating-point drift. */
export function toSatang(e: Pick<Expense, 'amount' | 'currency'>, rateToThb: number): number {
  if (!Number.isFinite(e.amount) || e.amount < 0) return 0
  const rate = e.currency === 'THB' ? 1 : rateToThb
  if (!Number.isFinite(rate) || rate <= 0) return 0
  // integer math: amount in cents × rate in 1/10000 (DB stores rate as numeric(8,4))
  const cents = Math.round(e.amount * 100)
  const rate4 = Math.round(rate * 10000)
  return Math.round((cents * rate4) / 10000)
}

export interface Settlement {
  totalSatang: number
  paid: Record<Person, number>
  share: Record<Person, number>
  /** expenses whose payer is not set yet — excluded from paid/share */
  unassignedSatang: number
  unassignedCount: number
  /** who owes whom; null when even */
  transfer: { from: Person; to: Person; satang: number } | null
  byCategory: Record<Category, number>
}

export function settle(expenses: readonly Expense[], rateToThb: number): Settlement {
  const paid: Record<Person, number> = { aum: 0, tiw: 0 }
  const share: Record<Person, number> = { aum: 0, tiw: 0 }
  const byCategory: Record<Category, number> = {
    booking: 0, transport: 0, food: 0, ticket: 0, shopping: 0, other: 0,
  }
  let total = 0
  let unassigned = 0
  let unassignedCount = 0

  for (const e of expenses) {
    const s = toSatang(e, rateToThb)
    total += s
    byCategory[e.category] = (byCategory[e.category] ?? 0) + s

    if (e.paid_by !== 'aum' && e.paid_by !== 'tiw') {
      unassigned += s
      unassignedCount++
      continue
    }
    paid[e.paid_by] += s

    if (e.split === 'half') {
      // odd satang goes to the payer so the two shares always sum to s
      const half = Math.floor(s / 2)
      const other: Person = e.paid_by === 'aum' ? 'tiw' : 'aum'
      share[other] += half
      share[e.paid_by] += s - half
    } else {
      share[e.split] += s
    }
  }

  const netAum = paid.aum - share.aum // > 0: tiw owes aum
  let transfer: Settlement['transfer'] = null
  if (netAum > 0) transfer = { from: 'tiw', to: 'aum', satang: netAum }
  else if (netAum < 0) transfer = { from: 'aum', to: 'tiw', satang: -netAum }

  return { totalSatang: total, paid, share, unassignedSatang: unassigned, unassignedCount, transfer, byCategory }
}

const fmt = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export function baht(satang: number): string {
  return '฿' + fmt.format(satang / 100)
}
