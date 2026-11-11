<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import { ArrowRight, Clock } from 'lucide-vue-next'
import { formatMins } from '../lib/now'
import { plainText, usePlanNow } from '../lib/usePlanNow'
import type { Guide } from '../trips/registry'

const props = defineProps<{ guide: Guide; base: string }>()
const { state } = usePlanNow(props.guide)

const view = computed(() => {
  const s = state.value
  if (!s || s.kind !== 'during') return null
  const day = props.guide.days[s.current.day]
  const cur = day.items[s.current.item]
  const nextDay = s.next ? props.guide.days[s.next.day] : null
  const next = s.next && nextDay ? nextDay.items[s.next.item] : null
  return {
    accent: day.accent,
    dayLabel: day.label,
    to: `${props.base}/day/${s.current.day}`,
    cur: { time: cur.time, title: plainText(cur.title) },
    next: next ? { time: next.time, title: plainText(next.title), in: formatMins(s.minsToNext ?? 0), soon: (s.minsToNext ?? 99) <= 30 } : null,
  }
})
</script>

<template>
  <RouterLink v-if="view" :to="view.to" class="card block !p-0 overflow-hidden transition active:scale-[.99]"
              :style="{ borderLeft: `6px solid ${view.accent}` }">
    <div class="px-4 pt-3 pb-2.5">
      <p class="flex items-center gap-1.5 text-xs font-bold tracking-wide" :style="{ color: view.accent }">
        <Clock class="size-3.5" /> ตอนนี้ · {{ view.dayLabel }}
      </p>
      <p class="mt-1 font-semibold leading-snug"><span class="text-mute">{{ view.cur.time }}</span> {{ view.cur.title }}</p>
    </div>
    <div v-if="view.next" class="flex items-start gap-2 bg-sand/60 px-4 py-2.5 text-sm">
      <ArrowRight class="mt-0.5 size-4 shrink-0 text-mute" />
      <p class="min-w-0 flex-1 leading-snug">
        <span class="font-semibold">ถัดไป {{ view.next.time }}</span> {{ view.next.title }}
        <span class="ml-1 inline-block rounded-full px-2 py-0.5 text-xs font-bold"
              :class="view.next.soon ? 'bg-brick text-white' : 'bg-white text-navy'">อีก {{ view.next.in }}</span>
      </p>
    </div>
  </RouterLink>
</template>
