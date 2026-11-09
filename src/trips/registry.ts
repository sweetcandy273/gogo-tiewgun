import qingdao from './qingdao-2027'

export interface DayItem {
  time: string
  title: string // trusted HTML from the trip book (bundled, never user input)
  body: string // trusted HTML from the trip book
  zh: string[]
  tags: { kind: string; text: string }[]
  minor: boolean
}
export interface Day {
  label: string
  title: string
  transport: string
  accent: string
  /** Amap city hint, e.g. '青岛' */
  city?: string
  items: DayItem[]
  cards: { title: string; body: string; zh: string[] }[]
  photos: { src: string; caption: string }[]
}
export interface Phrase { meaning: string; zh: string; pinyin: string; read: string }

/** Optional hand-written guide for a trip (itinerary, phrases, info). Keyed by trips.slug. */
export interface Guide {
  hero: { src: string; alt: string; kicker: string; title: string; sub: string; departAt?: string }
  /** default Amap city hint for the trip */
  amapCity?: string
  days: Day[]
  phrases: { section: string; items: Phrase[] }[]
  drinks?: readonly (readonly [string, string, string])[]
  flights: { leg: string; date: string; no: string; route: string; time: string }[]
  flightsTitle?: string
  bookingNote?: string
  hotels: { city: string; amapCity?: string; name: string; zh: string; address: string; phones: string[]; note: string; photo: string }[]
  emergency: { label: string; value: string }[]
  checklist: string[]
  budget: { item: string; thb: string; status: 'ok' | 'est' }[]
  budgetTotal: string
  budgetNote: string
}

export const guides: Record<string, Guide> = {
  'qingdao-2027': qingdao,
}
