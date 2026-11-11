import { ref } from 'vue'
import type { Person } from './types'

/** Who is using this phone (remembered per device; used as the default payer / ticker). */
const KEY = 'gogo-me'

function load(): Person | '' {
  try {
    const v = localStorage.getItem(KEY)
    return v === 'aum' || v === 'tiw' ? v : ''
  } catch { return '' }
}

export const me = ref<Person | ''>(typeof localStorage === 'undefined' ? '' : load())

export function setMe(p: Person): void {
  me.value = p
  try { localStorage.setItem(KEY, p) } catch { /* ignore */ }
}
