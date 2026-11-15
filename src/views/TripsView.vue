<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ChevronRight, Plus, RotateCcw, Trash2 } from 'lucide-vue-next'
import TripForm from '../components/TripForm.vue'
import { showToast } from '../lib/copy'
import { errMessage, repo } from '../lib/repo'
import { deleteAllowed, needsTypedName } from '../lib/tripDelete'
import type { Trip, TripInput } from '../lib/types'
import { guides } from '../trips/registry'

const trips = ref<Trip[]>([])
const active = computed(() => trips.value.filter((t) => !t.deleted_at))
const trashed = computed(() => trips.value.filter((t) => !!t.deleted_at))
const trashOpen = ref(false)
const manage = ref(false) // "จัดการ" mode: the move-to-trash buttons only exist while this is on
const trashing = ref<Trip | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const formOpen = ref(false)
const router = useRouter()
const deleting = ref<Trip | null>(null)
const typed = ref('')
const removing = ref(false)
const hasGuide = (t: Trip) => !!guides[t.slug]

function askDelete(t: Trip) { deleting.value = t; typed.value = '' }

async function trash() {
  const t = trashing.value
  if (!t) return
  trashing.value = null
  try {
    await repo.trashTrip(t.id)
    await load()
    manage.value = false
    showToast(`ย้าย "${t.name}" ไปถังขยะแล้ว`)
  } catch (e) {
    error.value = errMessage(e)
  }
}
async function restore(t: Trip) {
  try {
    await repo.restoreTrip(t.id)
    await load()
    showToast(`กู้คืน "${t.name}" แล้ว`)
  } catch (e) {
    error.value = errMessage(e)
  }
}
async function confirmDelete() {
  const t = deleting.value
  if (!t || removing.value || !deleteAllowed(t.name, typed.value, hasGuide(t))) return
  removing.value = true
  try {
    await repo.removeTrip(t.id)
    deleting.value = null
    await load()
  } catch (e) {
    error.value = errMessage(e)
    deleting.value = null
  } finally {
    removing.value = false
  }
}

async function load() {
  try {
    trips.value = await repo.listTrips()
    if (!trips.value.some((t) => t.deleted_at)) trashOpen.value = false // empty trash starts closed next time
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
      <button v-if="active.length" class="rounded-full px-3 py-1.5 text-sm font-medium ring-1" :class="manage ? 'bg-navy text-white ring-transparent' : 'text-mute ring-black/10'"
              @click="manage = !manage">{{ manage ? 'เสร็จ' : 'จัดการ' }}</button>
    </header>

    <p v-if="error" class="mb-3 rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-800">{{ error }}</p>
    <p v-if="loading" class="py-10 text-center text-sm text-mute">กำลังโหลด…</p>
    <p v-else-if="!active.length" class="py-10 text-center text-sm text-mute">ยังไม่มีทริป กด + เพื่อสร้าง</p>

    <div class="space-y-3">
      <div v-for="(t, i) in active" :key="t.id" class="relative">
      <RouterLink :to="`/t/${t.slug}`" class="card relative block overflow-hidden !p-0 transition active:scale-[.99]"
                  :class="manage ? 'opacity-70' : ''" @click="manage && $event.preventDefault()">
        <div class="relative h-36 bg-gradient-to-br from-navy to-sea">
          <img v-if="cover(t)" :src="cover(t)" alt="" class="absolute inset-0 size-full object-cover" />
          <div class="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-transparent" />
          <span class="absolute top-3 left-3 rounded-full bg-white/90 px-2.5 py-0.5 text-xs font-bold text-navy">ทริป {{ active.length - i }}</span>
          <div class="absolute inset-x-0 bottom-0 p-4 text-white">
            <h2 class="text-xl font-bold">{{ t.name }}</h2>
            <p class="text-sm opacity-90">{{ range(t) }} · {{ t.currency }}</p>
          </div>
          <ChevronRight class="absolute right-3 bottom-4 size-6 text-white/80" />
        </div>
      </RouterLink>
      <button v-if="manage" class="absolute top-3 right-3 flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-sm font-semibold text-brick shadow-sm active:scale-95"
              :aria-label="`ย้ายทริป ${t.name} ไปถังขยะ`" @click="trashing = t"><Trash2 class="size-4" /> ย้ายไปถังขยะ</button>
      </div>
    </div>

    <section v-if="trashed.length" class="mt-6">
      <button class="flex w-full items-center justify-between py-2 text-sm font-semibold text-mute" @click="trashOpen = !trashOpen">
        <span class="flex items-center gap-1.5"><Trash2 class="size-4" /> ถังขยะ ({{ trashed.length }})</span>
        <span class="text-xs">{{ trashOpen ? 'ซ่อน' : 'ดู' }}</span>
      </button>
      <div v-if="trashOpen" class="space-y-2">
        <div v-for="t in trashed" :key="t.id" class="card flex items-center gap-2 !p-3">
          <div class="min-w-0 flex-1">
            <p class="truncate font-semibold">{{ t.name }}</p>
            <p class="text-xs text-mute">{{ range(t) }} · {{ t.currency }}</p>
          </div>
          <button class="btn-ghost !px-3 !py-2 text-sm" @click="restore(t)"><RotateCcw class="size-4" /> กู้คืน</button>
          <button class="rounded-full p-2 text-mute hover:text-brick" :aria-label="`ลบ ${t.name} ถาวร`" @click="askDelete(t)"><Trash2 class="size-4" /></button>
        </div>
      </div>
    </section>
  </div>

  <div v-if="trashing" class="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" @click.self="trashing = null">
    <div class="w-full max-w-lg space-y-3 rounded-t-3xl bg-cream p-5 sm:rounded-3xl" style="padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))">
      <h2 class="text-lg font-bold">ย้าย "{{ trashing.name }}" ไปถังขยะ ?</h2>
      <p class="text-sm text-ink/80">ทริปจะหายจากหน้านี้ แต่ข้อมูลยังอยู่ครบ กู้คืนได้จากถังขยะด้านล่าง</p>
      <div class="flex gap-2">
        <button class="btn-ghost flex-1" @click="trashing = null">ไม่ย้าย</button>
        <button class="btn-danger flex-1" @click="trash">ย้ายไปถังขยะ</button>
      </div>
    </div>
  </div>

  <div v-if="deleting" class="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" @click.self="deleting = null">
    <form class="w-full max-w-lg space-y-3 rounded-t-3xl bg-cream p-5 sm:rounded-3xl" style="padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))"
          @submit.prevent="confirmDelete">
      <h2 class="text-lg font-bold text-brick">ลบ "{{ deleting.name }}" ถาวร ?</h2>
      <p class="text-sm text-ink/80">ลบจริงแล้วกู้คืนไม่ได้ ค่าใช้จ่าย เสื้อผ้า ชุด เช็กลิสต์ และข้อมูลการจองของทริปนี้จะหายหมด</p>
      <div v-if="needsTypedName(hasGuide(deleting))">
        <label class="label" for="del-name">พิมพ์ชื่อทริปเพื่อยืนยัน</label>
        <input id="del-name" v-model="typed" class="field" autocomplete="off" :placeholder="deleting.name" />
      </div>
      <div class="flex gap-2">
        <button type="button" class="btn-ghost flex-1" @click="deleting = null">ไม่ลบ</button>
        <button class="btn-danger flex-1" :disabled="removing || !deleteAllowed(deleting.name, typed, hasGuide(deleting))">{{ removing ? 'กำลังลบ…' : 'ลบถาวร' }}</button>
      </div>
    </form>
  </div>

  <button class="fixed right-5 bottom-8 z-30 grid size-14 place-items-center rounded-full bg-brick text-white shadow-lg active:scale-95" aria-label="สร้างทริปใหม่" @click="formOpen = true">
    <Plus class="size-7" />
  </button>
  <TripForm v-if="formOpen" :trip="null" @save="create" @close="formOpen = false" />
</template>
