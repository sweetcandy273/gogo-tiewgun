import type { Cloth, ClothKind, OutfitPick, Person } from './types'

/** Every date from start to end inclusive (YYYY-MM-DD). Empty when dates are missing/invalid; capped at 60 days. */
export function tripDays(start: string | null, end: string | null): string[] {
  if (!start || !end) return []
  const re = /^\d{4}-\d{2}-\d{2}$/
  if (!re.test(start) || !re.test(end) || end < start) return []
  const out: string[] = []
  const d = new Date(start + 'T00:00:00Z')
  const last = new Date(end + 'T00:00:00Z')
  while (d <= last && out.length < 60) {
    out.push(d.toISOString().slice(0, 10))
    d.setUTCDate(d.getUTCDate() + 1)
  }
  return out
}

export interface WardrobeStats {
  total: number
  byOwner: Record<Person | 'none', number>
  byKind: Partial<Record<ClothKind, number>>
  unused: number
}

export function wardrobeStats(clothes: readonly Cloth[], picks: readonly OutfitPick[]): WardrobeStats {
  const used = new Set(picks.map((p) => p.cloth_id))
  const byOwner: WardrobeStats['byOwner'] = { aum: 0, tiw: 0, none: 0 }
  const byKind: WardrobeStats['byKind'] = {}
  let unused = 0
  for (const c of clothes) {
    byOwner[c.owner ?? 'none']++
    byKind[c.kind] = (byKind[c.kind] ?? 0) + 1
    if (!used.has(c.id)) unused++
  }
  return { total: clothes.length, byOwner, byKind, unused }
}

/** cloth id → sorted days it is worn */
export function daysByCloth(picks: readonly OutfitPick[]): Map<string, string[]> {
  const m = new Map<string, string[]>()
  for (const p of picks) m.set(p.cloth_id, [...(m.get(p.cloth_id) ?? []), p.day])
  for (const v of m.values()) v.sort()
  return m
}

/** clothes worn on a day, optionally only one person's */
export function outfitFor(day: string, owner: Person | null, clothes: readonly Cloth[], picks: readonly OutfitPick[]): Cloth[] {
  const ids = new Set(picks.filter((p) => p.day === day).map((p) => p.cloth_id))
  const order: ClothKind[] = ['outer', 'top', 'inner', 'bottom', 'shoes', 'accessory']
  return clothes
    .filter((c) => ids.has(c.id) && (owner === null || c.owner === owner))
    .sort((a, b) => order.indexOf(a.kind) - order.indexOf(b.kind))
}
