import { ref } from 'vue'

/** City hint for Amap searches on the page being viewed (e.g. '青岛'); empty = let Amap decide. */
export const amapCity = ref('')

/**
 * Amap web URI: opens the Amap app when installed (callnative=1), otherwise Amap's mobile web map.
 * https://uri.amap.com/search?keyword=…&city=…&src=…&callnative=1
 */
export function amapSearchUrl(keyword: string, city = amapCity.value): string {
  const q = new URLSearchParams({ keyword: keyword.trim(), src: 'gogo-tiewgun', callnative: '1' })
  if (city) q.set('city', city)
  return `https://uri.amap.com/search?${q.toString()}`
}
