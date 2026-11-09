import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = (import.meta.env.VITE_SUPABASE_URL as string | undefined)?.trim()
const key = (import.meta.env.VITE_SUPABASE_KEY as string | undefined)?.trim()

/** null when env vars are missing → app runs in demo mode (browser-only storage). */
export const supabase: SupabaseClient | null =
  url && key ? createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } }) : null

export const isDemo = supabase === null
