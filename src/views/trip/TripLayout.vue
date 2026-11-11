<script setup lang="ts">
import { computed, provide, ref, watch } from 'vue'
import { RouterLink, RouterView, useRoute, useRouter } from 'vue-router'
import { CalendarDays, Info, Languages, LayoutGrid, Plus, Shirt, Wallet } from 'lucide-vue-next'
import QuickExpense from '../../components/QuickExpense.vue'
import { errMessage, repo } from '../../lib/repo'
import { TripKey } from '../../lib/tripContext'
import type { Trip } from '../../lib/types'
import { guides } from '../../trips/registry'

const props = defineProps<{ slug: string }>()
const router = useRouter()
const route = useRoute()
const quickOpen = ref(false)
// pages with their own add button don't get the quick one
const showQuick = computed(() => !!trip.value && route.name !== 'expenses' && route.name !== 'outfits')
const trip = ref<Trip | null>(null)
const error = ref<string | null>(null)

const tripRef = computed<Trip>({
  get: () => trip.value as Trip,
  set: (v) => { trip.value = v },
})
const guide = computed(() => guides[props.slug] ?? null)
const base = computed(() => `/t/${props.slug}`)

// provide a stable object; children read .trip (writable ref) and .guide/.base snapshots
const ctx = { trip: tripRef, guide: guide.value, base: base.value }
provide(TripKey, ctx)

async function load() {
  try {
    const t = await repo.getTrip(props.slug)
    if (!t) { await router.replace('/'); return }
    trip.value = t
    ctx.guide = guides[props.slug] ?? null
    ctx.base = `/t/${props.slug}`
  } catch (e) {
    error.value = errMessage(e)
  }
}
watch(() => props.slug, () => { trip.value = null; void load() }, { immediate: true })

const tabs = computed(() => [
  { to: '/', label: 'ทริป', icon: LayoutGrid, show: true },
  { to: base.value, label: 'แผนเที่ยว', icon: CalendarDays, show: !!guide.value, exact: true },
  { to: `${base.value}/expenses`, label: 'ค่าใช้จ่าย', icon: Wallet, show: true },
  { to: `${base.value}/outfits`, label: 'ชุด', icon: Shirt, show: true },
  { to: `${base.value}/phrases`, label: 'คำศัพท์', icon: Languages, show: !!guide.value?.phrases.length },
  { to: `${base.value}/info`, label: 'ข้อมูล', icon: Info, show: !!guide.value },
].filter((t) => t.show))
</script>

<template>
  <div class="mx-auto min-h-dvh max-w-2xl pb-24">
    <p v-if="error" class="m-4 rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-800">{{ error }}</p>
    <p v-else-if="!trip" class="py-16 text-center text-sm text-mute">กำลังโหลด…</p>
    <RouterView v-else :key="slug" />
  </div>

  <button v-if="showQuick" class="fixed right-5 bottom-24 z-30 flex items-center gap-1.5 rounded-full bg-brick py-3 pr-4 pl-3.5 font-semibold text-white shadow-lg active:scale-95"
          aria-label="จดค่าใช้จ่ายด่วน" @click="quickOpen = true">
    <Plus class="size-5" /> จดเงิน
  </button>
  <QuickExpense v-if="quickOpen && trip" :trip="trip" @close="quickOpen = false" />

  <nav class="fixed inset-x-0 bottom-0 z-30 border-t border-black/5 bg-white/95 backdrop-blur" style="padding-bottom: env(safe-area-inset-bottom)">
    <div class="mx-auto grid max-w-2xl" :style="{ gridTemplateColumns: `repeat(${tabs.length}, minmax(0, 1fr))` }">
      <RouterLink v-for="t in tabs" :key="t.to" :to="t.to"
        class="flex flex-col items-center gap-0.5 py-2 text-[0.7rem] font-medium text-mute"
        :exact-active-class="t.exact ? '!text-navy' : ''" :active-class="t.exact || t.to === '/' ? '' : '!text-navy'">
        <component :is="t.icon" class="size-5" />
        {{ t.label }}
      </RouterLink>
    </div>
  </nav>
</template>
