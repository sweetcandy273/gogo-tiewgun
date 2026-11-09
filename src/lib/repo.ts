import type { RealtimeChannel } from '@supabase/supabase-js'
import { supabase } from './supabase'
import type { Expense, ExpenseInput, Trip, TripInput } from './types'

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
  /** calls onChange when data changes on another device; returns unsubscribe */
  subscribe(onChange: () => void): () => void
}

const TRIP_COLS = 'id,slug,name,start_date,end_date,currency,rate_to_thb'
const EXP_COLS = 'id,trip_id,spent_on,category,title,currency,amount,paid_by,split,note,created_at,updated_at'

const toTrip = (r: Record<string, unknown>): Trip => ({ ...(r as unknown as Trip), rate_to_thb: Number(r.rate_to_thb) })
const toExpense = (r: Record<string, unknown>): Expense => ({ ...(r as unknown as Expense), amount: Number(r.amount) })

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

  async listExpenses(tripId: string) {
    const { data, error } = await this.db.from('expenses').select(EXP_COLS).eq('trip_id', tripId)
      .order('spent_on', { ascending: false }).order('created_at', { ascending: false })
    if (error) throw error
    return (data ?? []).map(toExpense)
  }
  async createExpense(input: ExpenseInput) {
    const { data, error } = await this.db.from('expenses').insert(input).select(EXP_COLS).single()
    if (error) throw error
    return toExpense(data)
  }
  async updateExpense(id: string, input: ExpenseInput) {
    const { data, error } = await this.db.from('expenses').update(input).eq('id', id).select(EXP_COLS).single()
    if (error) throw error
    return toExpense(data)
  }
  async removeExpense(id: string) {
    const { error } = await this.db.from('expenses').delete().eq('id', id)
    if (error) throw error
  }

  subscribe(onChange: () => void): () => void {
    const ch: RealtimeChannel = this.db
      .channel(`gogo-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, onChange)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'trips' }, onChange)
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
    return this.expenses().filter((e) => e.trip_id === tripId)
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
  subscribe() { return () => {} }
}

export const repo: Repo = supabase ? new SupabaseRepo() : new LocalRepo()

export function errMessage(err: unknown): string {
  if (err instanceof Error) return err.message
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message)
  return 'เกิดข้อผิดพลาด'
}
