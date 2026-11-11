import type { CheckItem, Person } from './types'

export interface ChecklistRow {
  key: string
  label: string
  done: boolean
  doneBy: Person | null
  custom: boolean
}

export const guideKey = (text: string) => `g:${text}`
export const MAX_LABEL = 200

/** Guide items first (in guide order), then own items (oldest first). Unknown guide keys are ignored. */
export function mergeChecklist(guideItems: readonly string[], rows: readonly CheckItem[]): ChecklistRow[] {
  const byKey = new Map(rows.map((r) => [r.item_key, r]))
  const out: ChecklistRow[] = guideItems.map((text) => {
    const r = byKey.get(guideKey(text))
    return { key: guideKey(text), label: text, done: r?.done === true, doneBy: r?.done ? r.done_by : null, custom: false }
  })
  const custom = rows
    .filter((r) => r.item_key.startsWith('c:') && r.label && r.label.trim())
    .sort((a, b) => (a.created_at ?? '').localeCompare(b.created_at ?? '') || a.item_key.localeCompare(b.item_key))
  for (const r of custom) {
    out.push({ key: r.item_key, label: (r.label ?? '').trim(), done: r.done, doneBy: r.done ? r.done_by : null, custom: true })
  }
  return out
}

/** Cleans a typed label; null when nothing usable. */
export function cleanLabel(s: string): string | null {
  const t = s.replace(/\s+/g, ' ').trim().slice(0, MAX_LABEL)
  return t || null
}

/**
 * Old per-device ticks (before the shared list) → rows to upload once.
 * Only ticked guide items that the shared list doesn't know yet.
 */
export function legacyToRows(
  tripId: string,
  legacy: unknown,
  guideItems: readonly string[],
  existing: readonly CheckItem[],
  by: Person | null,
): CheckItem[] {
  if (!legacy || typeof legacy !== 'object' || Array.isArray(legacy)) return []
  const known = new Set(existing.map((r) => r.item_key))
  const items = new Set(guideItems)
  return Object.entries(legacy as Record<string, unknown>)
    .filter(([text, v]) => v === true && items.has(text) && !known.has(guideKey(text)))
    .map(([text]) => ({ trip_id: tripId, item_key: guideKey(text), label: null, done: true, done_by: by }))
}
