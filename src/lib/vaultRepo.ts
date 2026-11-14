import { supabase } from './supabase'
import type { Booking, BookingInput } from './types'
import { CODE_RE, type UnlockResult } from './vault'

/** The token is missing, expired or was revoked → the device must unlock again. */
export class VaultAuthError extends Error {
  constructor() { super('vault_unauthorized') }
}

export interface VaultApi {
  unlock(slug: string, code: string, label?: string): Promise<UnlockResult>
  list(token: string): Promise<Booking[]>
  save(token: string, input: BookingInput): Promise<Booking>
  remove(token: string, id: string): Promise<void>
  lock(token: string): Promise<void>
  revokeAll(token: string): Promise<void>
}

type RpcError = { code?: string; message?: string }

function rpcError(e: RpcError): Error {
  if (e.code === '28000' || /vault_unauthorized/.test(e.message ?? '')) return new VaultAuthError()
  // function not created yet → migration 008 not run
  if (e.code === 'PGRST202' || e.code === '42883' || /could not find the function/i.test(e.message ?? '')) {
    return new Error('ยังไม่ได้รัน SQL 008 (ตู้เก็บข้อมูลจอง) ใน Supabase')
  }
  return Object.assign(new Error(e.message ?? 'เกิดข้อผิดพลาด'), { code: e.code })
}

const toBooking = (r: Record<string, unknown>): Booking => r as unknown as Booking

function parseUnlock(v: unknown): UnlockResult {
  const r = (v ?? {}) as Record<string, unknown>
  if (r.ok === true && typeof r.token === 'string' && typeof r.expires_at === 'string') {
    return { ok: true, token: r.token, expires_at: r.expires_at }
  }
  switch (r.reason) {
    case 'wrong': return { ok: false, reason: 'wrong', remaining: Math.max(0, Number(r.remaining) || 0) }
    case 'locked': return { ok: false, reason: 'locked', retry_after: Math.max(0, Number(r.retry_after) || 0) }
    case 'bad_format': return { ok: false, reason: 'bad_format' }
    default: return { ok: false, reason: 'not_set' }
  }
}

class SupabaseVault implements VaultApi {
  private async rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
    if (!supabase) throw new Error('Supabase is not configured')
    const { data, error } = await supabase.rpc(fn, args)
    if (error) throw rpcError(error)
    return data as T
  }
  async unlock(slug: string, code: string, label?: string) {
    return parseUnlock(await this.rpc('vault_unlock', { p_slug: slug, p_code: code, p_label: label ?? null }))
  }
  async list(token: string) {
    const rows = await this.rpc<Record<string, unknown>[] | null>('vault_list', { p_token: token })
    return (rows ?? []).map(toBooking)
  }
  async save(token: string, i: BookingInput) {
    const row = await this.rpc<Record<string, unknown>>('vault_save', {
      p_token: token, p_id: i.id ?? null, p_kind: i.kind, p_title: i.title, p_ref: i.ref, p_on_date: i.on_date, p_details: i.details,
    })
    return toBooking(row)
  }
  async remove(token: string, id: string) { await this.rpc('vault_delete', { p_token: token, p_id: id }) }
  async lock(token: string) { await this.rpc('vault_lock', { p_token: token }) }
  async revokeAll(token: string) { await this.rpc('vault_revoke_all', { p_token: token }) }
}

/**
 * Demo mode (no Supabase): everything stays in this browser. The code is 1234 and is NOT protected —
 * this only exists so the screens can be tried and tested without a backend.
 */
class LocalVault implements VaultApi {
  private read<T>(key: string): T[] {
    try {
      const v: unknown = JSON.parse(localStorage.getItem(key) ?? '[]')
      return Array.isArray(v) ? (v as T[]) : []
    } catch { return [] }
  }
  private write(key: string, v: unknown) { try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* ignore */ } }
  private fails = 0
  private tripId(slug: string) {
    const trips = this.read<{ id: string; slug: string }>('gogo-demo-trips')
    return trips.find((t) => t.slug === slug)?.id ?? 'demo-qingdao'
  }
  private tripOf = 'demo-qingdao'

  async unlock(slug: string, code: string) {
    if (!CODE_RE.test(code)) return { ok: false, reason: 'bad_format' } as const
    if (code !== '1234') {
      this.fails++
      return { ok: false, reason: 'wrong', remaining: Math.max(0, 5 - this.fails) } as const
    }
    this.fails = 0
    this.tripOf = this.tripId(slug)
    const token = Array.from(crypto.getRandomValues(new Uint8Array(32)), (b) => b.toString(16).padStart(2, '0')).join('')
    return { ok: true, token, expires_at: new Date(Date.now() + 365 * 86_400_000).toISOString() } as const
  }
  private all() { return this.read<Booking>('gogo-demo-bookings') }
  async list() { return this.all().filter((b) => b.trip_id === this.tripOf) }
  async save(_t: string, i: BookingInput) {
    const all = this.all()
    const row: Booking = { id: i.id ?? crypto.randomUUID(), trip_id: this.tripOf, kind: i.kind, title: i.title, ref: i.ref, on_date: i.on_date, details: i.details }
    const idx = all.findIndex((b) => b.id === row.id)
    if (idx >= 0) all[idx] = row
    else all.push(row)
    this.write('gogo-demo-bookings', all)
    return row
  }
  async remove(_t: string, id: string) { this.write('gogo-demo-bookings', this.all().filter((b) => b.id !== id)) }
  async lock() {}
  async revokeAll() {}
}

export const vaultApi: VaultApi = supabase ? new SupabaseVault() : new LocalVault()
