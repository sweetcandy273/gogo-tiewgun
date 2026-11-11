import { ref } from 'vue'

/** A place to show full-screen to a taxi/DiDi driver or hotel staff. */
export interface DriverTarget { zh: string; sub?: string; city?: string }

export const driverTarget = ref<DriverTarget | null>(null)

export function showDriver(t: DriverTarget): void {
  const zh = t.zh.trim()
  if (zh) driverTarget.value = { ...t, zh }
}
export function hideDriver(): void { driverTarget.value = null }
