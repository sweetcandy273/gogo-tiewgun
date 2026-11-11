<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { Phone, Plus, Trash2 } from 'lucide-vue-next'
import PageHeader from '../../components/PageHeader.vue'
import { cleanLabel, legacyToRows, mergeChecklist, type ChecklistRow } from '../../lib/checklist'
import { showToast } from '../../lib/copy'
import { me, setMe } from '../../lib/me'
import { dbFeatures, errMessage, repo } from '../../lib/repo'
import { isDemo } from '../../lib/supabase'
import { useTrip } from '../../lib/tripContext'
import { PEOPLE, type CheckItem } from '../../lib/types'

const { trip, guide } = useTrip()
const tripId = trip.value.id
const guideItems = guide?.checklist ?? []

const rows = ref<CheckItem[]>([])
const loaded = ref(false)
const busy = ref(new Set<string>())
const newLabel = ref('')
const list = computed(() => mergeChecklist(guideItems, rows.value))
const doneCount = computed(() => list.value.filter((r) => r.done).length)

// ticks from before the list was shared (kept per device) → uploaded once, then forgotten
const LEGACY_KEY = `gogo-checklist-${trip.value.slug}`
async function migrateLegacy() {
  let legacy: unknown = null
  try { legacy = JSON.parse(localStorage.getItem(LEGACY_KEY) ?? 'null') } catch { legacy = null }
  if (legacy === null) return
  const up = legacyToRows(tripId, legacy, guideItems, rows.value, me.value || null)
  if (up.length) await repo.saveChecks(up)
  try { localStorage.removeItem(LEGACY_KEY) } catch { /* ignore */ }
  if (up.length) await load()
}

async function load() {
  try {
    rows.value = await repo.listChecks(tripId)
  } catch (e) {
    showToast(`โหลดเช็กลิสต์ไม่ได้: ${errMessage(e)}`)
  } finally {
    loaded.value = true
  }
}

function patchLocal(row: CheckItem) {
  const i = rows.value.findIndex((r) => r.item_key === row.item_key)
  if (i >= 0) rows.value[i] = { ...rows.value[i], ...row }
  else rows.value.push(row)
}

async function toggle(r: ChecklistRow) {
  if (busy.value.has(r.key)) return
  const before = rows.value.map((x) => ({ ...x }))
  const row: CheckItem = { trip_id: tripId, item_key: r.key, label: r.custom ? r.label : null, done: !r.done, done_by: !r.done ? me.value || null : null }
  patchLocal(row) // optimistic
  busy.value.add(r.key)
  try {
    await repo.saveCheck(row)
  } catch (e) {
    rows.value = before
    showToast(`บันทึกไม่ได้: ${errMessage(e)}`)
  } finally {
    busy.value.delete(r.key)
  }
}

async function add() {
  const label = cleanLabel(newLabel.value)
  if (!label) return
  if (list.value.some((r) => r.label === label)) { showToast('มีรายการนี้แล้ว'); return }
  const row: CheckItem = { trip_id: tripId, item_key: `c:${crypto.randomUUID()}`, label, done: false, done_by: null, created_at: new Date().toISOString() }
  rows.value.push(row)
  newLabel.value = ''
  try {
    await repo.saveCheck(row)
  } catch (e) {
    rows.value = rows.value.filter((x) => x.item_key !== row.item_key)
    newLabel.value = label
    showToast(`เพิ่มไม่ได้: ${errMessage(e)}`)
  }
}

async function remove(r: ChecklistRow) {
  if (!r.custom || !window.confirm(`ลบ "${r.label}" ?`)) return
  const before = rows.value
  rows.value = rows.value.filter((x) => x.item_key !== r.key)
  try {
    await repo.removeCheck(tripId, r.key)
  } catch (e) {
    rows.value = before
    showToast(`ลบไม่ได้: ${errMessage(e)}`)
  }
}

let unsub: (() => void) | null = null
let reloadTimer: ReturnType<typeof setTimeout> | undefined
onMounted(async () => {
  await load()
  await migrateLegacy()
  // debounce bursts of realtime events
  unsub = repo.subscribeChecks(() => { clearTimeout(reloadTimer); reloadTimer = setTimeout(() => { void load() }, 250) })
})
onBeforeUnmount(() => { unsub?.(); clearTimeout(reloadTimer) })
</script>

<template>
  <PageHeader kicker="INFO" title="เช็กลิสต์ & ข้อมูลสำคัญ" />
  <div v-if="guide" class="space-y-5 px-4">
    <section v-if="guide.emergency.length" class="card border-l-4 border-brick">
      <h2 class="mb-2 font-bold text-brick">เบอร์ฉุกเฉิน</h2>
      <a v-for="e in guide.emergency" :key="e.label" :href="`tel:${e.value.replace(/[^+\d]/g, '')}`"
         class="flex items-center justify-between border-b border-black/5 py-2 last:border-0">
        <span class="text-sm">{{ e.label }}</span>
        <span class="flex items-center gap-1 font-semibold text-navy"><Phone class="size-4" /> {{ e.value }}</span>
      </a>
    </section>

    <section class="card">
      <div class="mb-2 flex items-center justify-between gap-2">
        <h2 class="font-bold">เช็กลิสต์ก่อนไป</h2>
        <span v-if="list.length" class="rounded-full bg-sand px-2.5 py-0.5 text-xs font-bold text-navy">{{ doneCount }}/{{ list.length }}</span>
      </div>
      <div class="mb-2 flex items-center gap-2 text-xs text-mute">
        <span>ติ๊กในนาม</span>
        <button v-for="(n, k) in PEOPLE" :key="k" type="button" class="rounded-full px-2.5 py-1 font-semibold ring-1"
                :class="me === k ? 'bg-navy text-white ring-transparent' : 'bg-white text-ink ring-black/10'" @click="setMe(k)">{{ n }}</button>
      </div>

      <p v-if="!loaded" class="py-3 text-center text-sm text-mute">กำลังโหลด…</p>
      <div v-for="r in list" v-else :key="r.key" class="flex items-start gap-3 border-b border-black/5 py-1.5 last:border-0">
        <label class="flex min-w-0 flex-1 cursor-pointer items-start gap-3">
          <input type="checkbox" class="mt-0.5 size-5 shrink-0 accent-[#1b4965]" :checked="r.done" :disabled="busy.has(r.key)" @change="toggle(r)" />
          <span class="text-sm" :class="r.done ? 'text-mute line-through' : ''">{{ r.label }}</span>
        </label>
        <span v-if="r.doneBy" class="mt-0.5 shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[0.65rem] font-bold text-emerald-800">✓ {{ PEOPLE[r.doneBy] }}</span>
        <button v-if="r.custom" class="shrink-0 rounded-full p-1 text-mute hover:text-brick" :aria-label="`ลบ ${r.label}`" @click="remove(r)">
          <Trash2 class="size-4" />
        </button>
      </div>

      <form class="mt-3 flex gap-2" @submit.prevent="add">
        <input v-model="newLabel" class="field min-w-0 flex-1 !py-2 text-sm" maxlength="200" placeholder="เพิ่มรายการ เช่น ร่มพับ" aria-label="เพิ่มรายการเช็กลิสต์" />
        <button class="btn-primary shrink-0 !px-3 !py-2" :disabled="!newLabel.trim()" aria-label="เพิ่ม"><Plus class="size-4" /></button>
      </form>
      <p class="mt-2 text-xs text-mute">
        <template v-if="isDemo">โหมดทดลอง · เก็บไว้ในเครื่องนี้</template>
        <template v-else-if="dbFeatures.checklist">ติ๊กแล้วอีกเครื่องเห็นทันที</template>
        <template v-else>ยังไม่ได้รัน SQL เช็กลิสต์ร่วม (006) · ตอนนี้เก็บไว้ในเครื่องนี้ก่อน</template>
      </p>
    </section>

    <section v-if="guide.budget.length" class="card">
      <h2 class="mb-2 font-bold">งบต่อคน</h2>
      <div v-for="b in guide.budget" :key="b.item" class="flex items-center justify-between gap-3 border-b border-black/5 py-2 text-sm last:border-0">
        <span>{{ b.item }}</span>
        <span class="shrink-0 font-semibold">฿{{ b.thb }} <span :class="['tag', b.status === 'ok' ? 'tag-ok' : 'tag-est']">{{ b.status === 'ok' ? 'จ่าย/ยืนยัน' : 'ประมาณ' }}</span></span>
      </div>
      <div class="mt-2 flex justify-between rounded-xl bg-navy px-3 py-2 text-sm font-bold text-white">
        <span>รวมโดยประมาณ</span><span>฿{{ guide.budgetTotal }}</span>
      </div>
      <p class="mt-2 text-xs text-mute">{{ guide.budgetNote }}</p>
    </section>
  </div>
</template>
