import type { Category, Cloth, Expense, Person } from './types'

/** Money is handled in satang (integer) to avoid floating-point drift. */
export function toSatang(e: Pick<Expense, 'amount' | 'currency'>, rateToThb: number): number {
  if (!Number.isFinite(e.amount) || e.amount < 0) return 0
  const rate = e.currency === 'THB' ? 1 : rateToThb
  if (!Number.isFinite(rate) || rate <= 0) return 0
  // integer math: amount in cents × rate in 1/10000 (DB stores rate as numeric(10,4))
  const cents = Math.round(e.amount * 100)
  const rate4 = Math.round(rate * 10000)
  return Math.round((cents * rate4) / 10000)
}

export type Transfer = { from: Person; to: Person; satang: number } | null

/** netAum > 0 means tiw owes aum; < 0 means aum owes tiw. */
export function toTransfer(netAum: number): Transfer {
  if (netAum > 0) return { from: 'tiw', to: 'aum', satang: netAum }
  if (netAum < 0) return { from: 'aum', to: 'tiw', satang: -netAum }
  return null
}

export interface Settlement {
  /** every expense of the trip, settled or not */
  totalSatang: number
  /** all expenses with a payer (whole-trip view) */
  paid: Record<Person, number>
  share: Record<Person, number>
  /** payer not set yet — excluded from paid/share/owed */
  unassignedSatang: number
  unassignedCount: number
  /** ticked as cleared between the two — excluded from what is still owed */
  settledSatang: number
  settledCount: number
  /** still owed from unsettled expenses */
  netAum: number
  transfer: Transfer
  byCategory: Record<Category, number>
}

/** shares of one expense: odd satang goes to the payer so both shares sum to s */
function shareOf(e: Expense, s: number, payer: Person): Record<Person, number> {
  const out: Record<Person, number> = { aum: 0, tiw: 0 }
  if (e.split === 'half') {
    const half = Math.floor(s / 2)
    out[payer === 'aum' ? 'tiw' : 'aum'] = half
    out[payer] = s - half
  } else {
    out[e.split] = s
  }
  return out
}

export function settle(expenses: readonly Expense[], rateToThb: number): Settlement {
  const paid: Record<Person, number> = { aum: 0, tiw: 0 }
  const share: Record<Person, number> = { aum: 0, tiw: 0 }
  const byCategory: Record<Category, number> = { booking: 0, transport: 0, food: 0, ticket: 0, shopping: 0, other: 0 }
  let total = 0
  let unassigned = 0
  let unassignedCount = 0
  let settled = 0
  let settledCount = 0
  let netAum = 0

  for (const e of expenses) {
    const s = toSatang(e, rateToThb)
    total += s
    byCategory[e.category] = (byCategory[e.category] ?? 0) + s

    if (e.paid_by !== 'aum' && e.paid_by !== 'tiw') {
      unassigned += s
      unassignedCount++
      continue
    }
    const sh = shareOf(e, s, e.paid_by)
    paid[e.paid_by] += s
    share.aum += sh.aum
    share.tiw += sh.tiw

    if (e.settled) {
      settled += s
      settledCount++
      continue
    }
    netAum += (e.paid_by === 'aum' ? s : 0) - sh.aum
  }

  return {
    totalSatang: total, paid, share,
    unassignedSatang: unassigned, unassignedCount,
    settledSatang: settled, settledCount,
    netAum, transfer: toTransfer(netAum), byCategory,
  }
}

export interface ClothesMoney {
  totalSatang: number
  byOwner: Record<Person | 'none', number>
  /** priced items whose owner is not set — can't be billed yet */
  unassignedCount: number
  /** ticked as paid back */
  settledSatang: number
  /** still owed for clothes bought for the other person */
  netAum: number
  transfer: Transfer
  /** items one person bought for the other (the ones that can be ticked) */
  billable: Cloth[]
}

export function clothesMoney(clothes: readonly Cloth[]): ClothesMoney {
  const byOwner: ClothesMoney['byOwner'] = { aum: 0, tiw: 0, none: 0 }
  let total = 0
  let unassignedCount = 0
  let settled = 0
  let netAum = 0
  const billable: Cloth[] = []

  for (const c of clothes) {
    const s = c.price != null && Number.isFinite(c.price) && c.price > 0 ? Math.round(c.price * 100) : 0
    if (!s) continue
    total += s
    byOwner[c.owner ?? 'none'] += s
    if (!c.owner) { unassignedCount++; continue }
    const payer: Person = c.paid_by ?? 'aum'
    if (payer === c.owner) continue
    billable.push(c)
    if (c.settled) { settled += s; continue }
    netAum += payer === 'aum' ? s : -s
  }
  return { totalSatang: total, byOwner, unassignedCount, settledSatang: settled, netAum, transfer: toTransfer(netAum), billable }
}

const fmt = new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
export function baht(satang: number): string {
  return '฿' + fmt.format(satang / 100)
}
