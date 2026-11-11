import { computed, onBeforeUnmount, ref } from 'vue'
import type { Guide } from '../trips/registry'
import { buildTimeline, clockOverride, nowState } from './now'

/** Plain text from the bundled trip-book HTML (titles are trusted, this is only for display). */
export function plainText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Reactive "where are we in the plan" for the trip guide; ticks every 30 s. */
export function usePlanNow(guide: Guide | null) {
  const fixed = typeof location === 'undefined' ? null : clockOverride(location.search)
  const now = ref(fixed ?? Date.now())
  const timer = fixed === null ? setInterval(() => { now.value = Date.now() }, 30_000) : undefined
  onBeforeUnmount(() => clearInterval(timer))

  const timeline = guide ? buildTimeline(guide.days) : []
  const state = computed(() => nowState(timeline, now.value))
  return { state, now }
}
