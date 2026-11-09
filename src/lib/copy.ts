import { ref } from 'vue'

export const toast = ref<string | null>(null)
let timer: ReturnType<typeof setTimeout> | undefined

export function showToast(text: string): void {
  toast.value = text
  clearTimeout(timer)
  timer = setTimeout(() => { toast.value = null }, 1600)
}

export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text)
    showToast(`คัดลอกแล้ว: ${text}`)
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
    showToast(ok ? `คัดลอกแล้ว: ${text}` : 'คัดลอกไม่ได้ กดค้างที่ข้อความแทน')
  }
}

/** Event delegation: tap any <span class="zh"> inside rendered HTML to copy it. */
export function onZhClick(ev: MouseEvent): void {
  const el = (ev.target as HTMLElement | null)?.closest('.zh')
  if (el?.textContent) void copyText(el.textContent.trim())
}
