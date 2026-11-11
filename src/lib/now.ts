/** "Where are we in the plan right now?" — pure helpers, no DOM. */

export interface TimedDay {
  /** YYYY-MM-DD local date of the day's first item */
  date?: string
  /** UTC offset of the day's times, e.g. '+08:00' */
  tz?: string
  items: { time: string; tz?: string }[]
}

export interface PlanPoint { day: number; item: number; at: number }

export type NowState =
  | { kind: 'before'; next: PlanPoint; minsToNext: number }
  | { kind: 'during'; current: PlanPoint; next: PlanPoint | null; minsToNext: number | null }
  | { kind: 'after' }

const TZ_RE = /^[+-]\d{2}:\d{2}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

/** First HH:MM in a plan time label ("~23:30–00:00" → 23:30, "→ 07:00" → 07:00). */
export function parseStart(time: string): { h: number; m: number } | null {
  const m = /(\d{1,2}):(\d{2})/.exec(time)
  if (!m) return null
  const h = Number(m[1])
  const min = Number(m[2])
  if (h > 23 || min > 59) return null
  return { h, m: min }
}

function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/**
 * Turns every timed plan item into an absolute instant.
 * Within a day, a time that jumps back by more than 6 h (e.g. 23:30 → 07:00) rolls over to the next date.
 */
export function buildTimeline(days: readonly TimedDay[], defaultTz = '+08:00'): PlanPoint[] {
  const out: PlanPoint[] = []
  days.forEach((d, di) => {
    if (!d.date || !DATE_RE.test(d.date)) return
    let date = d.date
    let prev = -1
    d.items.forEach((it, ii) => {
      const t = parseStart(it.time)
      if (!t) return
      const mins = t.h * 60 + t.m
      if (prev >= 0 && mins < prev - 360) date = addDays(date, 1)
      prev = mins
      const tz = it.tz ?? d.tz ?? defaultTz
      if (!TZ_RE.test(tz)) return
      const hh = String(t.h).padStart(2, '0')
      const mm = String(t.m).padStart(2, '0')
      const at = Date.parse(`${date}T${hh}:${mm}:00${tz}`)
      if (Number.isFinite(at)) out.push({ day: di, item: ii, at })
    })
  })
  return out.sort((a, b) => a.at - b.at)
}

/** after the last item, keep showing it for this long (flight home etc.) */
const TAIL_MS = 4 * 3_600_000

export function nowState(timeline: readonly PlanPoint[], now: number): NowState | null {
  if (!timeline.length || !Number.isFinite(now)) return null
  const first = timeline[0]
  const last = timeline[timeline.length - 1]
  if (now < first.at) return { kind: 'before', next: first, minsToNext: Math.ceil((first.at - now) / 60_000) }
  if (now > last.at + TAIL_MS) return { kind: 'after' }

  let ci = 0
  for (let i = 0; i < timeline.length; i++) {
    if (timeline[i].at <= now) ci = i
    else break
  }
  const next = timeline[ci + 1] ?? null
  return {
    kind: 'during',
    current: timeline[ci],
    next,
    minsToNext: next ? Math.ceil((next.at - now) / 60_000) : null,
  }
}

/** "1 ชม. 5 นาที" */
export function formatMins(mins: number): string {
  if (!Number.isFinite(mins) || mins <= 0) return 'ตอนนี้'
  const h = Math.floor(mins / 60)
  const m = mins % 60
  if (h && m) return `${h} ชม. ${m} นาที`
  return h ? `${h} ชม.` : `${m} นาที`
}

/** Testing aid: ?now=2027-01-14T10:30:00+08:00 overrides the clock. */
export function clockOverride(search: string): number | null {
  const v = new URLSearchParams(search).get('now')
  if (!v) return null
  const t = Date.parse(v)
  return Number.isFinite(t) ? t : null
}
