import { ref } from 'vue'
import type { Session } from '@supabase/supabase-js'
import { supabase } from './supabase'

export const session = ref<Session | null>(null)
export const authReady = ref(supabase === null)

let started: Promise<void> | null = null

/** Resolve once the stored session (if any) has been loaded. */
export function initAuth(): Promise<void> {
  if (started) return started
  started = (async () => {
    if (!supabase) return
    const { data } = await supabase.auth.getSession()
    session.value = data.session
    supabase.auth.onAuthStateChange((_event, s) => { session.value = s })
    authReady.value = true
  })()
  return started
}

export async function signIn(email: string, password: string): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error) throw error
}

export async function signOut(): Promise<void> {
  if (!supabase) return
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
