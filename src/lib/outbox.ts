import { ref } from 'vue'
import type { ExpenseInput } from './types'

/** Expenses saved while offline wait here (per device) until they can be sent. */
export interface Pending { key: string; input: ExpenseInput; queuedAt: number }

export interface KV { getItem(k: string): string | null; setItem(k: string, v: string): void }

const KEY = 'gogo-outbox'
const MAX = 200

function isPending(v: unknown): v is Pending {
  if (!v || typeof v !== 'object') return false
  const p = v as Record<string, unknown>
  const i = p.input as Record<string, unknown> | undefined
  return typeof p.key === 'string' && typeof p.queuedAt === 'number' && !!i &&
    typeof i.trip_id === 'string' && typeof i.title === 'string' && typeof i.amount === 'number'
}

export function readQueue(kv: KV): Pending[] {
  try {
    const v: unknown = JSON.parse(kv.getItem(KEY) ?? '[]')
    return Array.isArray(v) ? v.filter(isPending) : []
  } catch {
    return []
  }
}

function writeQueue(kv: KV, q: Pending[]): boolean {
  try { kv.setItem(KEY, JSON.stringify(q)); return true } catch { return false }
}

export function enqueue(kv: KV, input: ExpenseInput, now = Date.now()): boolean {
  const q = readQueue(kv)
  if (q.length >= MAX) return false
  q.push({ key: `${now}-${Math.random().toString(36).slice(2, 8)}`, input, queuedAt: now })
  return writeQueue(kv, q)
}

/** true when the failure looks like "no connection" rather than a server/validation error */
export function isNetworkError(e: unknown, online = true): boolean {
  if (!online) return true
  if (e instanceof TypeError) return true
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e)
  return /failed to fetch|load failed|networkerror|network request failed|fetch failed/i.test(msg)
}

/**
 * Sends queued items in order. Stops at the first network error (keeps the rest);
 * an item rejected by the server is dropped so it can't block the queue forever.
 */
export async function flushQueue(
  kv: KV,
  send: (input: ExpenseInput) => Promise<unknown>,
  online = true,
): Promise<{ sent: number; dropped: number; left: number }> {
  let sent = 0
  let dropped = 0
  for (const p of readQueue(kv)) {
    try {
      await send(p.input)
      sent++
    } catch (e) {
      if (isNetworkError(e, online)) break
      dropped++
    }
    // re-read so items queued meanwhile are kept
    writeQueue(kv, readQueue(kv).filter((x) => x.key !== p.key))
  }
  return { sent, dropped, left: readQueue(kv).length }
}

/* ---- app-level state ---- */

function storage(): KV | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}

export const pendingCount = ref(0)
export function refreshPending(): void {
  const kv = storage()
  pendingCount.value = kv ? readQueue(kv).length : 0
}

export function queueExpense(input: ExpenseInput): boolean {
  const kv = storage()
  const ok = !!kv && enqueue(kv, input)
  refreshPending()
  return ok
}

let flushing = false
export async function flushPending(send: (input: ExpenseInput) => Promise<unknown>) {
  const kv = storage()
  if (!kv || flushing) return null
  flushing = true
  try {
    return await flushQueue(kv, send, typeof navigator === 'undefined' ? true : navigator.onLine)
  } finally {
    flushing = false
    refreshPending()
  }
}
