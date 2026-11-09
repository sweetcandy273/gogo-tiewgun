import { inject, type InjectionKey, type Ref } from 'vue'
import type { Guide } from '../trips/registry'
import type { Trip } from './types'

export interface TripCtx { trip: Ref<Trip>; guide: Guide | null; base: string }
export const TripKey: InjectionKey<TripCtx> = Symbol('trip')

export function useTrip(): TripCtx {
  const ctx = inject(TripKey)
  if (!ctx) throw new Error('useTrip() must be used inside TripLayout')
  return ctx
}
