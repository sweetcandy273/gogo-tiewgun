import { ref } from 'vue'
import { amapSearchUrl } from './amap'
import type { DriverTarget } from './driver'

export interface Toast { text: string; action?: { label: string; href: string }; driver?: DriverTarget }
export const toast = ref<Toast | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

export function showToast(text: string, action?: Toast['action'], driver?: DriverTarget): void {
  toast.value = { text, action, driver }
  clearTimeout(timer)
  timer = setTimeout(() => { toast.value = null }, action || driver ? 4500 : 1600)
}

/** Copy a place name and offer "open in Amap". */
export async function copyPlace(text: string): Promise<void> {
  await copyText(text, { label: 'Amap', href: amapSearchUrl(text) }, { zh: text })
}

export async function copyText(text: string, action?: Toast['action'], driver?: DriverTarget): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    showToast(`คัดลอกแล้ว: ${text}`, action, driver)
  } catch {
    // fallback for older iOS / non-secure context
    const ta = document.createElement('textarea')
    ta.value = text
    ta.setAttribute('readonly', '')
    ta.style.position = 'fixed'
    ta.style.opacity = '0'
    document.body.appendChild(ta)
    ta.select()
    const ok = document.execCommand('copy')
    ta.remove()
    showToast(ok ? `คัดลอกแล้ว: ${text}` : 'คัดลอกไม่ได้ กดค้างที่ข้อความแทน', action, driver)
  }
}

/** Event delegation: tap any <span class="zh"> inside rendered HTML to copy it. */
export function onZhClick(ev: MouseEvent): void {
  const el = (ev.target as HTMLElement | null)?.closest('.zh')
  if (el?.textContent) void copyPlace(el.textContent.trim())
}
