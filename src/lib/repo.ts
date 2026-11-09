import { reactive } from 'vue'
import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Cloth, ClothInput, Expense, ExpenseInput, OutfitPick, Trip, TripInput } from './types'

export interface Repo {
  listTrips(): Promise<Trip[]>
  getTrip(slug: string): Promise<Trip | null>
  createTrip(input: TripInput): Promise<Trip>
  updateTrip(id: string, patch: Partial<TripInput>): Promise<Trip>
  removeTrip(id: string): Promise<void>
  listExpenses(tripId: string): Promise<Expense[]>
  createExpense(input: ExpenseInput): Promise<Expense>
  updateExpense(id: string, input: ExpenseInput): Promise<Expense>
  removeExpense(id: string): Promise<void>
  listClothes(tripId: string): Promise<Cloth[]>
  createCloth(input: ClothInput): Promise<Cloth>
  updateCloth(id: string, input: ClothInput): Promise<Cloth>
  removeCloth(c: Cloth): Promise<void>
  uploadPhoto(tripId: string, blob: Blob): Promise<{ url: string; path: string }>
  removePhoto(path: string): Promise<void>
  listPicks(tripId: string): Promise<OutfitPick[]>
  /** replace the picks of `day` among `scope` clothes (one person's) with `selected` */
  setPicks(tripId: string, day: string, scope: string[], selected: string[]): Promise<void>
  /** calls onChange when data changes on another device; returns unsubscribe */
  subscribe(onChange: () => void): () => void
}

const TRIP_COLS = 'id,slug,name,start_date,end_date,currency,rate_to_thb'
const EXP_COLS_BASE = 'id,trip_id,spent_on,category,title,currency,amount,paid_by,split,note,created_at,updated_at'

/** Which optional DB migrations are applied (detected at runtime so the app keeps working before SQL is run). */
export const dbFeatures = reactive({ isPaid: true, outfits: true })

/** Postgres/PostgREST "column or table does not exist" style errors. */
export function isMissingSchema(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null
  if (!e) return false
  if (['42703', '42P01', 'PGRST204', 'PGRST205'].includes(e.code ?? '')) return true
  return /does not exist|Could not find the/i.test(e.message ?? '')
}

const toTrip = (r: Record<string, unknown>): Trip => ({ ...(r as unknown as Trip), rate_to_thb: Number(r.rate_to_thb) })
const CLOTH_COLS = 'id,trip_id,owner,name,kind,photo_url,photo_path,note'
const toExpense = (r: Record<string, unknown>): Expense => ({ ...(r as unknown as Expense), amount: Number(r.amount), is_paid: r.is_paid !== false })

class SupabaseRepo implements Repo {
  private get db() {
    if (!supabase) throw new Error('Supabase is not configured')
    return supabase
  }

  async listTrips() {
    const { data, error } = await this.db.from('trips').select(TRIP_COLS)
      .order('start_date', { ascending: false, nullsFirst: true })
    if (error) throw error
    return (data ?? []).map(toTrip)
  }
  async getTrip(slug: string) {
    const { data, error } = await this.db.from('trips').select(TRIP_COLS).eq('slug', slug).maybeSingle()
    if (error) throw error
    return data ? toTrip(data) : null
  }
  async createTrip(input: TripInput) {
    const { data, error } = await this.db.from('trips').insert(input).select(TRIP_COLS).single()
    if (error) throw error
    return toTrip(data)
  }
  async updateTrip(id: string, patch: Partial<TripInput>) {
    const { data, error } = await this.db.from('trips').update(patch).eq('id', id).select(TRIP_COLS).single()
    if (error) throw error
    return toTrip(data)
  }
  async removeTrip(id: string) {
    const { error } = await this.db.from('trips').delete().eq('id', id)
    if (error) throw error
  }

  private get expCols() { return dbFeatures.isPaid ? EXP_COLS_BASE + ',is_paid' : EXP_COLS_BASE }
  private expRow(input: ExpenseInput): Partial<ExpenseInput> {
    if (dbFeatures.isPaid) return input
    const { is_paid: _ignored, ...rest } = input
    return rest
  }
  /** run once; if the is_paid column is missing, switch it off and retry without it */
  private async withIsPaidFallback<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn()
    } catch (e) {
      if (dbFeatures.isPaid && isMissingSchema(e)) {
        dbFeatures.isPaid = false
        return fn()
      }
      throw e
    }
  }

  async listExpenses(tripId: string) {
    return this.withIsPaidFallback(async () => {
      const { data, error } = await this.db.from('expenses').select(this.expCols).eq('trip_id', tripId)
        .order('spent_on', { ascending: false }).order('created_at', { ascending: false })
      if (error) throw error
      return ((data ?? []) as unknown as Record<string, unknown>[]).map(toExpense)
    })
  }
  async createExpense(input: ExpenseInput) {
    return this.withIsPaidFallback(async () => {
      const { data, error } = await this.db.from('expenses').insert(this.expRow(input)).select(this.expCols).single()
      if (error) throw error
      return toExpense(data as unknown as Record<string, unknown>)
    })
  }
  async updateExpense(id: string, input: ExpenseInput) {
    return this.withIsPaidFallback(async () => {
      const { data, error } = await this.db.from('expenses').update(this.expRow(input)).eq('id', id).select(this.expCols).single()
      if (error) throw error
      return toExpense(data as unknown as Record<string, unknown>)
    })
  }
  async removeExpense(id: string) {
    const { error } = await this.db.from('expenses').delete().eq('id', id)
    if (error) throw error
  }

  async listClothes(tripId: string) {
    const { data, error } = await this.db.from('clothes').select(CLOTH_COLS).eq('trip_id', tripId)
      .order('created_at', { ascending: true })
    if (error) throw error
    return (data ?? []) as Cloth[]
  }
  async createCloth(input: ClothInput) {
    const { data, error } = await this.db.from('clothes').insert(input).select(CLOTH_COLS).single()
    if (error) throw error
    return data as Cloth
  }
  async updateCloth(id: string, input: ClothInput) {
    const { data, error } = await this.db.from('clothes').update(input).eq('id', id).select(CLOTH_COLS).single()
    if (error) throw error
    return data as Cloth
  }
  async removeCloth(c: Cloth) {
    const { error } = await this.db.from('clothes').delete().eq('id', c.id)
    if (error) throw error
    if (c.photo_path) await this.removePhoto(c.photo_path).catch(() => { /* orphan file is harmless */ })
  }
  async uploadPhoto(tripId: string, blob: Blob) {
    const path = `${tripId}/${crypto.randomUUID()}.jpg`
    const { error } = await this.db.storage.from('clothes').upload(path, blob, { contentType: 'image/jpeg', upsert: false })
    if (error) throw error
    const { data } = this.db.storage.from('clothes').getPublicUrl(path)
    return { url: data.publicUrl, path }
  }
  async removePhoto(path: string) {
    const { error } = await this.db.storage.from('clothes').remove([path])
    if (error) throw error
  }
  async listPicks(tripId: string) {
    const { data, error } = await this.db.from('outfit_picks').select('trip_id,day,cloth_id').eq('trip_id', tripId)
    if (error) throw error
    return (data ?? []) as OutfitPick[]
  }
  async setPicks(tripId: string, day: string, scope: string[], selected: string[]) {
    if (scope.length) {
      const { error } = await this.db.from('outfit_picks').delete().eq('trip_id', tripId).eq('day', day).in('cloth_id', scope)
      if (error) throw error
    }
    if (selected.length) {
      const rows = selected.map((cloth_id) => ({ trip_id: tripId, day, cloth_id }))
      const { error } = await this.db.from('outfit_picks').upsert(rows, { onConflict: 'day,cloth_id' })
      if (error) throw error
    }
  }

  subscribe(onChange: () => void): () => void {
    const ch: RealtimeChannel = this.db
      .channel(`gogo-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clothes' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'outfit_picks' }, onChange)
      .subscribe()
    return () => { void this.db.removeChannel(ch) }
  }
}

/** Demo mode: everything lives only in this browser's localStorage. */
class LocalRepo implements Repo {
  private read<T>(key: string, fallback: T[]): T[] {
    try {
      const raw = localStorage.getItem(key)
      const v: unknown = raw ? JSON.parse(raw) : null
      return Array.isArray(v) ? (v as T[]) : fallback
    } catch {
      return fallback
    }
  }
  private write(key: string, v: unknown) {
    try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* blocked or full */ }
  }
  private trips(): Trip[] {
    return this.read<Trip>('gogo-demo-trips', [{
      id: 'demo-qingdao', slug: 'qingdao-2027', name: 'ชิงเต่า 青岛',
      start_date: '2027-01-13', end_date: '2027-01-18', currency: 'CNY', rate_to_thb: 4.6,
    }])
  }
  private expenses(): Expense[] { return this.read<Expense>('gogo-demo-expenses', []) }

  async listTrips() { return this.trips().sort((a, b) => (b.start_date ?? '').localeCompare(a.start_date ?? '')) }
  async getTrip(slug: string) { return this.trips().find((t) => t.slug === slug) ?? null }
  async createTrip(input: TripInput) {
    const all = this.trips()
    if (all.some((t) => t.slug === input.slug)) throw new Error('ชื่อลิงก์ทริปนี้มีแล้ว')
    const t: Trip = { ...input, id: crypto.randomUUID() }
    this.write('gogo-demo-trips', [...all, t])
    return t
  }
  async updateTrip(id: string, patch: Partial<TripInput>) {
    const all = this.trips()
    const i = all.findIndex((t) => t.id === id)
    if (i < 0) throw new Error('ไม่พบทริปนี้')
    all[i] = { ...all[i], ...patch }
    this.write('gogo-demo-trips', all)
    return all[i]
  }
  async removeTrip(id: string) {
    this.write('gogo-demo-trips', this.trips().filter((t) => t.id !== id))
    this.write('gogo-demo-expenses', this.expenses().filter((e) => e.trip_id !== id))
  }

  async listExpenses(tripId: string) {
    return this.expenses().filter((e) => e.trip_id === tripId).map((e) => ({ ...e, is_paid: e.is_paid !== false }))
      .sort((a, b) => (b.spent_on + (b.created_at ?? '')).localeCompare(a.spent_on + (a.created_at ?? '')))
  }
  async createExpense(input: ExpenseInput) {
    const now = new Date().toISOString()
    const e: Expense = { ...input, id: crypto.randomUUID(), created_at: now, updated_at: now }
    this.write('gogo-demo-expenses', [...this.expenses(), e])
    return e
  }
  async updateExpense(id: string, input: ExpenseInput) {
    const all = this.expenses()
    const i = all.findIndex((x) => x.id === id)
    if (i < 0) throw new Error('ไม่พบรายการนี้')
    all[i] = { ...all[i], ...input, updated_at: new Date().toISOString() }
    this.write('gogo-demo-expenses', all)
    return all[i]
  }
  async removeExpense(id: string) {
    this.write('gogo-demo-expenses', this.expenses().filter((x) => x.id !== id))
  }
  private clothes(): Cloth[] { return this.read<Cloth>('gogo-demo-clothes', []) }
  private picks(): OutfitPick[] { return this.read<OutfitPick>('gogo-demo-picks', []) }
  async listClothes(tripId: string) { return this.clothes().filter((c) => c.trip_id === tripId) }
  async createCloth(input: ClothInput) {
    const c: Cloth = { ...input, id: crypto.randomUUID() }
    this.write('gogo-demo-clothes', [...this.clothes(), c])
    return c
  }
  async updateCloth(id: string, input: ClothInput) {
    const all = this.clothes()
    const i = all.findIndex((c) => c.id === id)
    if (i < 0) throw new Error('ไม่พบเสื้อผ้าชิ้นนี้')
    all[i] = { ...all[i], ...input }
    this.write('gogo-demo-clothes', all)
    return all[i]
  }
  async removeCloth(c: Cloth) {
    this.write('gogo-demo-clothes', this.clothes().filter((x) => x.id !== c.id))
    this.write('gogo-demo-picks', this.picks().filter((p) => p.cloth_id !== c.id))
  }
  async uploadPhoto(_tripId: string, blob: Blob) {
    // demo: keep the (already compressed) image inline
    const url = await new Promise<string>((resolve, reject) => {
      const r = new FileReader()
      r.onload = () => resolve(String(r.result))
      r.onerror = () => reject(r.error ?? new Error('อ่านรูปไม่ได้'))
      r.readAsDataURL(blob)
    })
    return { url, path: '' }
  }
  async removePhoto() {}
  async listPicks(tripId: string) { return this.picks().filter((p) => p.trip_id === tripId) }
  async setPicks(tripId: string, day: string, scope: string[], selected: string[]) {
    const drop = new Set(scope)
    const keep = this.picks().filter((p) => !(p.trip_id === tripId && p.day === day && drop.has(p.cloth_id)))
    this.write('gogo-demo-picks', [...keep, ...selected.map((cloth_id) => ({ trip_id: tripId, day, cloth_id }))])
  }
  subscribe() { return () => {} }
}

export const repo: Repo = supabase ? new SupabaseRepo() : new LocalRepo()

export function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message)
  return 'เกิดข้อผิดพลาด'
}
