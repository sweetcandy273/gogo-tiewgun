<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ChevronRight, Plus } from 'lucide-vue-next'
import TripForm from '../components/TripForm.vue'
import { errMessage, repo } from '../lib/repo'
import type { Trip, TripInput } from '../lib/types'
import { guides } from '../trips/registry'

const trips = ref<Trip[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const formOpen = ref(false)
const router = useRouter()

async function load() {
  try {
    trips.value = await repo.listTrips()
    error.value = null
  } catch (e) {
    error.value = errMessage(e)
  } finally {
    loading.value = false
  }
}
onMounted(load)

async function create(input: TripInput) {
  try {
    const t = await repo.createTrip(input)
    formOpen.value = false
    await router.push(`/t/${t.slug}/expenses`)
  } catch (e) {
    error.value = errMessage(e)
  }
}

const dateFmt = new Intl.DateTimeFormat('th-TH', { day: 'numeric', month: 'short', year: '2-digit' })
function range(t: Trip) {
  if (!t.start_date) return 'ยังไม่กำหนดวัน'
  const a = dateFmt.format(new Date(t.start_date + 'T00:00:00'))
  return t.end_date ? `${a} – ${dateFmt.format(new Date(t.end_date + 'T00:00:00'))}` : a
}
const cover = (t: Trip) => guides[t.slug]?.hero.src
</script>

<template>
  <div class="mx-auto min-h-dvh max-w-2xl px-4 pb-28">
    <header class="flex items-end justify-between pt-8 pb-5">
      <div>
        <p class="text-xs font-bold tracking-[0.3em] text-sea">TRIPS</p>
        <h1 class="text-3xl font-bold text-navy">gogo เที่ยวกัน</h1>
        <p class="text-sm text-mute">ทริปของอุ้มกับทิว</p>
      </div>
    </header>

    <p v-if="error" class="mb-3 rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-800">{{ error }}</p>
    <p v-if="loading" class="py-10 text-center text-sm text-mute">กำลังโหลด…</p>
    <p v-else-if="!trips.length" class="py-10 text-center text-sm text-mute">ยังไม่มีทริป กด + เพื่อสร้าง</p>

    <div class="space-y-3">
      <RouterLink v-for="(t, i) in trips" :key="t.id" :to="`/t/${t.slug}`"
        class="card relative block overflow-hidden !p-0 transition active:scale-[.99]">
        <div class="relative h-36 bg-gradient-to-br from-navy to-sea">
          <img v-if="cover(t)" :src="cover(t)" alt="" class="absolute inset-0 size-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-transparent" />
          <span class="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-navy">ทริป {{ trips.length - i }}</span>
          <div class="absolute inset-x-0 bottom-0 p-4 text-white">
            <h2 class="text-xl font-bold">{{ t.name }}</h2>
            <p class="text-sm opacity-90">{{ range(t) }} · {{ t.currency }}</p>
          </div>
          <ChevronRight class="absolute right-3 bottom-4 size-6 text-white/80" />
        </div>
      </RouterLink>
    </div>
  </div>

  <button class="fixed right-5 bottom-8 z-30 grid size-14 place-items-center rounded-full bg-brick text-white shadow-lg active:scale-95" aria-label="สร้างทริปใหม่" @click="formOpen = true">
    <Plus class="size-7" />
  </button>
  <TripForm v-if="formOpen" :trip="null" @save="create" @close="formOpen = false" />
</template>
