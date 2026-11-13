<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Check, Plus, Search, Shirt, X } from 'lucide-vue-next'
import PageHeader from '../../components/PageHeader.vue'
import ClothForm, { type ClothFormResult } from '../../components/ClothForm.vue'
import { showToast } from '../../lib/copy'
import { dbFeatures, errMessage, isMissingSchema, repo } from '../../lib/repo'
import { useTrip } from '../../lib/tripContext'
import { KINDS, PEOPLE, type Cloth, type ClothKind, type OutfitPick, type Person } from '../../lib/types'
import { daysByCloth, matchCloth, outfitFor, tripDays, wardrobeStats } from '../../lib/wardrobe'

const { trip } = useTrip()
const clothes = ref<Cloth[]>([])
const picks = ref<OutfitPick[]>([])
const loading = ref(true)
const error = ref<string | null>(null)
const busy = ref(false)

const person = ref<Person>('aum')
const days = computed(() => tripDays(trip.value.start_date, trip.value.end_date))
const day = ref<string>('')
const kindFilter = ref<ClothKind | 'all'>('all')
const query = ref('')
const searching = computed(() => query.value.trim() !== '')

const formOpen = ref(false)
const editing = ref<Cloth | null>(null)
const pickerOpen = ref(false)
const pickerSel = ref<Set<string>>(new Set())

let seq = 0
async function load() {
  const my = ++seq
  try {
    const [c, p] = await Promise.all([repo.listClothes(trip.value.id), repo.listPicks(trip.value.id)])
    if (my !== seq) return
    clothes.value = c
    picks.value = p
    error.value = null
    if (!day.value || !days.value.includes(day.value)) day.value = defaultDay()
  } catch (e) {
    if (my !== seq) return
    if (isMissingSchema(e)) dbFeatures.outfits = false
    else error.value = errMessage(e)
  } finally {
    if (my === seq) loading.value = false
  }
}
function defaultDay(): string {
  const today = new Date().toISOString().slice(0, 10)
  return days.value.includes(today) ? today : (days.value[0] ?? '')
}

let unsub: (() => void) | null = null
const onVisible = () => { if (document.visibilityState === 'visible') void load() }
onMounted(() => {
  void load()
  unsub = repo.subscribe(() => { void load() })
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => { unsub?.(); document.removeEventListener('visibilitychange', onVisible) })

const stats = computed(() => wardrobeStats(clothes.value, picks.value))
const worn = computed(() => daysByCloth(picks.value))
const mine = computed(() => clothes.value.filter((c) => c.owner === person.value))
const unassigned = computed(() => clothes.value.filter((c) => c.owner === null))
// searching looks through everyone's clothes, not only the selected person's
const shelf = computed(() => (searching.value ? clothes.value : [...mine.value, ...unassigned.value])
  .filter((c) => kindFilter.value === 'all' || c.kind === kindFilter.value)
  .filter((c) => !searching.value || matchCloth(c, query.value, { kind: KINDS[c.kind].label, owner: c.owner ? PEOPLE[c.owner] : 'ยังไม่ระบุ' })))
const todays = computed(() => (day.value ? outfitFor(day.value, person.value, clothes.value, picks.value) : []))
const countOn = (d: string) => outfitFor(d, person.value, clothes.value, picks.value).length

const dFmt = new Intl.DateTimeFormat('th-TH', { weekday: 'short', day: 'numeric' })
const dLong = new Intl.DateTimeFormat('th-TH', { weekday: 'long', day: 'numeric', month: 'short' })
const shortDay = (d: string) => dFmt.format(new Date(d + 'T00:00:00'))
const longDay = (d: string) => dLong.format(new Date(d + 'T00:00:00'))
const wornLabel = (c: Cloth) => {
  const ds = worn.value.get(c.id)
  return ds?.length ? ds.map((d) => Number(d.slice(8))).join(', ') : ''
}

function openPicker() {
  pickerSel.value = new Set(todays.value.map((c) => c.id))
  pickerOpen.value = true
}
function toggle(id: string) {
  const s = new Set(pickerSel.value)
  if (s.has(id)) s.delete(id); else s.add(id)
  pickerSel.value = s
}
async function savePicker() {
  if (busy.value) return
  busy.value = true
  try {
    const scope = mine.value.map((c) => c.id)
    await repo.setPicks(trip.value.id, day.value, scope, [...pickerSel.value].filter((id) => scope.includes(id)))
    pickerOpen.value = false
    showToast('บันทึกชุดแล้ว')
    await load()
  } catch (e) {
    error.value = errMessage(e)
  } finally {
    busy.value = false
  }
}

function openNew() { editing.value = null; formOpen.value = true }
function openEdit(c: Cloth) { editing.value = c; formOpen.value = true }

async function saveCloth(r: ClothFormResult) {
  if (busy.value) return
  busy.value = true
  try {
    const old = editing.value
    let photo_url = old?.photo_url ?? null
    let photo_path = old?.photo_path ?? null
    if (r.photo) {
      const up = await repo.uploadPhoto(trip.value.id, r.photo)
      photo_url = up.url
      photo_path = up.path || null
    } else if (r.clearPhoto) {
      photo_url = null
      photo_path = null
    }
    const input = { trip_id: trip.value.id, name: r.name, owner: r.owner, kind: r.kind, note: r.note, photo_url, photo_path, price: r.price, paid_by: r.paid_by, settled: r.settled }
    if (old) await repo.updateCloth(old.id, input)
    else await repo.createCloth(input)
    // old file no longer referenced → clean up (best effort)
    if (old?.photo_path && old.photo_path !== photo_path) await repo.removePhoto(old.photo_path).catch(() => {})
    formOpen.value = false
    showToast('บันทึกแล้ว')
    await load()
  } catch (e) {
    error.value = errMessage(e)
  } finally {
    busy.value = false
  }
}
async function removeCloth() {
  if (!editing.value || busy.value) return
  busy.value = true
  try {
    await repo.removeCloth(editing.value)
    formOpen.value = false
    showToast('ลบแล้ว')
    await load()
  } catch (e) {
    error.value = errMessage(e)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <PageHeader kicker="OUTFITS" :title="`ชุดแต่งกาย · ${trip.name}`" sub="จัดว่าวันไหนใส่ชุดไหน" accent="#A07A4F" />

  <div v-if="!dbFeatures.outfits" class="card mx-4 text-sm text-mute">
    ฟีเจอร์ชุดแต่งกายยังไม่พร้อมใช้ — ต้องรันไฟล์ <code>supabase/migrations/002–004</code> ใน Supabase SQL Editor ก่อน
  </div>
  <div v-else class="space-y-4 px-4">
    <p v-if="error" class="rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-800">{{ error }}</p>

    <!-- totals -->
    <section class="card !p-3">
      <div class="flex items-end justify-between">
        <div>
          <p class="text-xs text-mute">เสื้อผ้าทั้งหมด</p>
          <p class="text-3xl font-bold text-navy">{{ stats.total }} <span class="text-base font-semibold">ชิ้น</span></p>
        </div>
        <div class="text-right text-sm">
          <p>อุ้ม <b>{{ stats.byOwner.aum }}</b> · ทิว <b>{{ stats.byOwner.tiw }}</b></p>
          <p v-if="stats.byOwner.none" class="text-xs text-amber-700">ยังไม่ระบุเจ้าของ {{ stats.byOwner.none }}</p>
        </div>
      </div>
      <div class="mt-2 flex flex-wrap gap-1.5 text-xs">
        <span v-for="(k, key) in KINDS" v-show="stats.byKind[key]" :key="key" class="rounded-full bg-sand px-2 py-0.5">{{ k.emoji }} {{ k.label }} {{ stats.byKind[key] }}</span>
      </div>
      <p v-if="stats.total" class="mt-2 text-xs" :class="stats.unused ? 'text-amber-700' : 'text-emerald-700'">
        {{ stats.unused ? `ยังไม่ได้จัดใส่วันไหน ${stats.unused} ชิ้น — ไม่ใส่ก็ไม่ต้องแพ็ก` : 'ทุกชิ้นได้ใส่แล้ว 👍' }}
      </p>
    </section>

    <!-- person switch -->
    <div class="grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 ring-1 ring-black/5">
      <button v-for="(n, p) in PEOPLE" :key="p" class="rounded-xl py-2 text-sm font-semibold"
        :class="person === p ? 'bg-navy text-white' : 'text-mute'" @click="person = p">{{ n }} ({{ stats.byOwner[p] }})</button>
    </div>

    <!-- day planner -->
    <section v-if="days.length">
      <div class="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <button v-for="d in days" :key="d" class="relative shrink-0 rounded-xl px-3 py-2 text-sm ring-1"
          :class="day === d ? 'bg-brick text-white ring-transparent' : 'bg-white ring-black/10'" @click="day = d">
          {{ shortDay(d) }}
          <span v-if="countOn(d)" class="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-sea text-[0.65rem] font-bold text-white">{{ countOn(d) }}</span>
        </button>
      </div>

      <div class="card mt-2 !p-3">
        <div class="mb-2 flex items-center justify-between">
          <h2 class="font-bold">{{ PEOPLE[person] }} · {{ longDay(day) }}</h2>
          <button class="btn-primary !px-3 !py-1.5 text-xs" :disabled="!mine.length" @click="openPicker">เลือกชุด</button>
        </div>
        <p v-if="!mine.length" class="py-4 text-center text-sm text-mute">ยังไม่มีเสื้อผ้าของ{{ PEOPLE[person] }} — กด + เพื่อเพิ่ม</p>
        <p v-else-if="!todays.length" class="py-4 text-center text-sm text-mute">ยังไม่ได้เลือกชุดวันนี้</p>
        <div v-else class="grid grid-cols-3 gap-2">
          <button v-for="c in todays" :key="c.id" class="text-left" @click="openEdit(c)">
            <div class="grid aspect-square place-items-center overflow-hidden rounded-xl bg-sand">
              <img v-if="c.photo_url" :src="c.photo_url" :alt="c.name" class="size-full object-cover" loading="lazy" />
              <span v-else class="text-3xl">{{ KINDS[c.kind].emoji }}</span>
            </div>
            <p class="mt-1 line-clamp-2 text-xs">{{ c.name }}</p>
          </button>
        </div>
      </div>
    </section>
    <p v-else class="card text-sm text-mute">ตั้งวันไป–กลับของทริปก่อน (หน้าค่าใช้จ่าย → แก้ไขทริป) แล้วจะเลือกชุดรายวันได้</p>

    <!-- wardrobe -->
    <section>
      <h2 class="mb-2 font-bold">{{ searching ? `ผลการค้นหา · ทั้งสองคน (${shelf.length})` : `ตู้เสื้อผ้าของ${PEOPLE[person]}` }}</h2>
      <label class="relative mb-2 block">
        <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mute" />
        <input v-model="query" type="text" class="field !py-2 !pr-9 !pl-9 text-sm" placeholder="ค้นหา เช่น ฮีท, คอเต่า, กรม, 133" aria-label="ค้นหาเสื้อผ้า" enterkeyhint="search" />
        <button v-if="searching" type="button" class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-mute hover:bg-black/5" aria-label="ล้างคำค้นหา" @click="query = ''">
          <X class="size-4" />
        </button>
      </label>
      <div class="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2">
        <button class="shrink-0 rounded-full px-3 py-1.5 text-sm ring-1" :class="kindFilter === 'all' ? 'bg-ink text-white ring-transparent' : 'bg-white ring-black/10'" @click="kindFilter = 'all'">ทั้งหมด</button>
        <button v-for="(k, key) in KINDS" :key="key" class="shrink-0 rounded-full px-3 py-1.5 text-sm ring-1"
          :class="kindFilter === key ? 'bg-ink text-white ring-transparent' : 'bg-white ring-black/10'" @click="kindFilter = key">{{ k.emoji }} {{ k.label }}</button>
      </div>
      <p v-if="loading" class="py-8 text-center text-sm text-mute">กำลังโหลด…</p>
      <p v-else-if="!shelf.length" class="py-8 text-center text-sm text-mute"><Shirt class="mx-auto mb-1 size-6" />{{ searching ? `ไม่พบ "${query.trim()}"` : 'ยังไม่มีเสื้อผ้าในหมวดนี้' }}</p>
      <div v-else class="grid grid-cols-3 gap-2">
        <button v-for="c in shelf" :key="c.id" class="card !p-1.5 text-left active:scale-[.98]" @click="openEdit(c)">
          <div class="relative grid aspect-square place-items-center overflow-hidden rounded-xl bg-sand">
            <img v-if="c.photo_url" :src="c.photo_url" :alt="c.name" class="size-full object-cover" loading="lazy" />
            <span v-else class="text-3xl">{{ KINDS[c.kind].emoji }}</span>
            <span v-if="!c.owner" class="absolute top-1 left-1 rounded bg-amber-100 px-1 text-[0.6rem] font-semibold text-amber-800">ยังไม่ระบุ</span>
            <span v-else-if="searching" class="absolute top-1 left-1 rounded bg-white/90 px-1 text-[0.6rem] font-semibold text-navy">{{ PEOPLE[c.owner] }}</span>
          </div>
          <p class="mt-1 line-clamp-2 px-0.5 text-xs leading-snug">{{ c.name }}</p>
          <p v-if="c.price != null" class="px-0.5 text-[0.65rem] font-semibold">฿{{ c.price.toLocaleString('th-TH', { maximumFractionDigits: 2 }) }}</p>
          <p class="px-0.5 text-[0.65rem]" :class="wornLabel(c) ? 'text-sea' : 'text-mute'">{{ wornLabel(c) ? `ใส่วันที่ ${wornLabel(c)}` : 'ยังไม่ได้ใส่' }}</p>
        </button>
      </div>
    </section>
  </div>

  <button v-if="dbFeatures.outfits" class="fixed right-5 bottom-24 z-30 grid size-14 place-items-center rounded-full bg-brick text-white shadow-lg active:scale-95" aria-label="เพิ่มเสื้อผ้า" @click="openNew">
    <Plus class="size-7" />
  </button>

  <!-- picker -->
  <div v-if="pickerOpen" class="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" @click.self="pickerOpen = false">
    <div class="flex max-h-[88dvh] w-full max-w-lg flex-col rounded-t-3xl bg-cream sm:rounded-3xl">
      <div class="flex items-center justify-between p-4 pb-2">
        <h2 class="font-bold">ชุดของ{{ PEOPLE[person] }} · {{ longDay(day) }}</h2>
        <button class="rounded-full p-1.5 hover:bg-black/5" aria-label="ปิด" @click="pickerOpen = false"><X class="size-5" /></button>
      </div>
      <p class="px-4 text-xs text-mute">แตะเพื่อเลือก/เอาออก · เลือกแล้ว {{ pickerSel.size }} ชิ้น</p>
      <div class="grid grid-cols-3 gap-2 overflow-y-auto p-4">
        <button v-for="c in mine" :key="c.id" class="text-left" @click="toggle(c.id)">
          <div class="relative grid aspect-square place-items-center overflow-hidden rounded-xl bg-sand ring-2"
               :class="pickerSel.has(c.id) ? 'ring-brick' : 'ring-transparent'">
            <img v-if="c.photo_url" :src="c.photo_url" :alt="c.name" class="size-full object-cover" loading="lazy" />
            <span v-else class="text-3xl">{{ KINDS[c.kind].emoji }}</span>
            <span v-if="pickerSel.has(c.id)" class="absolute top-1 right-1 grid size-6 place-items-center rounded-full bg-brick text-white"><Check class="size-4" /></span>
          </div>
          <p class="mt-1 line-clamp-2 text-xs">{{ c.name }}</p>
        </button>
      </div>
      <div class="p-4 pt-0" style="padding-bottom: calc(1rem + env(safe-area-inset-bottom))">
        <button class="btn-primary w-full !py-3" :disabled="busy" @click="savePicker">{{ busy ? 'กำลังบันทึก…' : 'บันทึกชุดวันนี้' }}</button>
      </div>
    </div>
  </div>

  <ClothForm v-if="formOpen" :cloth="editing" :default-owner="person" :busy="busy" :show-money="dbFeatures.clothMoney" @save="saveCloth" @remove="removeCloth" @close="formOpen = false" />
</template>
