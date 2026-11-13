<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { ArrowRight, Check, Pencil, Plus, RefreshCw, Search, Shirt, X } from 'lucide-vue-next'
import PageHeader from '../../components/PageHeader.vue'
import ExpenseForm from '../../components/ExpenseForm.vue'
import TripForm from '../../components/TripForm.vue'
import { showToast } from '../../lib/copy'
import { dbFeatures, errMessage, isMissingSchema, repo } from '../../lib/repo'
import { baht, clothesMoney, toSatang, toTransfer } from '../../lib/settle'
import { matchCloth } from '../../lib/wardrobe'
import { useTrip } from '../../lib/tripContext'
import { CATEGORIES, KINDS, PEOPLE, SPLITS, sym, type Category, type Cloth, type Expense, type ExpenseInput, type TripInput } from '../../lib/types'
import { useExpenses } from '../../lib/useExpenses'

const { trip, base } = useTrip()
const { items, loading, error, summary, load, create, update, remove, setRate } = useExpenses(trip)
const router = useRouter()

type Tab = 'trip' | 'clothes'
const TAB_KEY = 'gogo-expense-tab'
function readTab(): Tab {
  try { return localStorage.getItem(TAB_KEY) === 'clothes' ? 'clothes' : 'trip' } catch { return 'trip' }
}
const tab = ref<Tab>(readTab())
function setTab(t: Tab) {
  tab.value = t
  try { localStorage.setItem(TAB_KEY, t) } catch { /* ignore */ }
}

const editing = ref<Expense | null>(null)
const formOpen = ref(false)
const tripFormOpen = ref(false)
const filter = ref<Category | 'all'>('all')
const rateInput = ref('')
const rateOpen = ref(false)
const isLocal = computed(() => trip.value.currency !== 'THB')

// ---- clothes money ----
const clothes = ref<Cloth[]>([])
const clothesReady = ref(true)
let cseq = 0
async function loadClothes() {
  const my = ++cseq
  try {
    const c = await repo.listClothes(trip.value.id)
    if (my === cseq) { clothes.value = c; clothesReady.value = true }
  } catch (e) {
    if (my !== cseq) return
    if (isMissingSchema(e)) clothesReady.value = false
    else error.value = errMessage(e)
  }
}
let unsub: (() => void) | null = null
onMounted(() => { void loadClothes(); unsub = repo.subscribe(() => { void loadClothes() }) })
onBeforeUnmount(() => unsub?.())

const cm = computed(() => clothesMoney(clothes.value))
const unpriced = computed(() => clothes.value.filter((c) => c.price == null).length)
const clothQuery = ref('')
const billableSorted = computed(() => [...cm.value.billable]
  .filter((c) => matchCloth(c, clothQuery.value, { kind: KINDS[c.kind].label, owner: c.owner ? PEOPLE[c.owner] : '' }))
  .sort((a, b) => Number(a.settled) - Number(b.settled)))
const clothesOn = computed(() => clothesReady.value && dbFeatures.clothMoney)
const combined = computed(() => toTransfer(summary.value.netAum + (clothesOn.value ? cm.value.netAum : 0)))
const combinedPaid = computed(() => toTransfer(summary.value.settledNetAum + (clothesOn.value ? cm.value.settledNetAum : 0)))
const fmtT = (net: number, none: string) => {
  const t = toTransfer(net)
  return t ? `${PEOPLE[t.from]} → ${PEOPLE[t.to]} ${baht(t.satang)}` : none
}

async function toggleCloth(c: Cloth) {
  try {
    const { id, ...rest } = c
    await repo.updateCloth(id, { ...rest, settled: !c.settled })
    showToast(c.settled ? 'ย้ายกลับเป็นยังค้าง' : 'ติ๊กว่าโอนแล้ว')
    await loadClothes()
  } catch (e) {
    error.value = errMessage(e)
  }
}

// ---- trip expenses ----
const filtered = computed(() => filter.value === 'all' ? items.value : items.value.filter((e) => e.category === filter.value))
const groups = computed(() => {
  const m = new Map<string, Expense[]>()
  for (const e of filtered.value) m.set(e.spent_on, [...(m.get(e.spent_on) ?? []), e])
  return [...m.entries()]
})
const dateFmt = new Intl.DateTimeFormat('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })
const showDate = (d: string) => dateFmt.format(new Date(d + 'T00:00:00'))

async function toggleSettled(e: Expense) {
  const { id, created_at: _c, updated_at: _u, ...rest } = e
  const ok = await update(id, { ...rest, settled: !e.settled })
  if (ok) showToast(e.settled ? 'ย้ายกลับเป็นยังค้าง' : 'ติ๊กว่าเคลียร์แล้ว')
}

function openNew() { editing.value = null; formOpen.value = true }
function openEdit(e: Expense) { editing.value = e; formOpen.value = true }

async function onSave(input: Omit<ExpenseInput, 'trip_id'>) {
  const ok = editing.value ? await update(editing.value.id, input) : await create(input)
  if (ok) { formOpen.value = false; showToast('บันทึกแล้ว') }
}
async function onRemove() {
  if (!editing.value) return
  const id = editing.value.id
  formOpen.value = false
  await remove(id)
  if (!error.value) showToast('ลบแล้ว')
}
async function saveRate() {
  const r = Number(rateInput.value)
  if (!Number.isFinite(r) || r <= 0 || r >= 100000) { showToast('เรตไม่ถูกต้อง'); return }
  await setRate(Math.round(r * 10000) / 10000)
  rateOpen.value = false
}
async function saveTrip(input: TripInput) {
  try {
    trip.value = await repo.updateTrip(trip.value.id, { ...input, slug: trip.value.slug })
    tripFormOpen.value = false
    showToast('บันทึกทริปแล้ว')
  } catch (e) {
    error.value = errMessage(e)
  }
}
async function removeTrip() {
  try {
    await repo.removeTrip(trip.value.id)
    await router.replace('/')
  } catch (e) {
    error.value = errMessage(e)
  }
}
function refresh() { void load(); void loadClothes() }
</script>

<template>
  <PageHeader kicker="EXPENSES" :title="`ค่าใช้จ่าย · ${trip.name}`" accent="#2F7FB3">
    <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-mute">
      <button v-if="isLocal" class="underline decoration-dotted" @click="rateOpen = !rateOpen; rateInput = String(trip.rate_to_thb)">
        1 {{ trip.currency }} = ฿{{ trip.rate_to_thb }}
      </button>
      <span v-if="isLocal">·</span>
      <button class="flex items-center gap-1" @click="refresh"><RefreshCw class="size-3.5" /> รีเฟรช</button>
      <span>·</span>
      <button class="flex items-center gap-1" @click="tripFormOpen = true"><Pencil class="size-3.5" /> แก้ไขทริป</button>
    </div>
    <form v-if="rateOpen" class="mt-2 flex gap-2" @submit.prevent="saveRate">
      <input v-model="rateInput" class="field !py-1.5" inputmode="decimal" :aria-label="`บาทต่อ 1 ${trip.currency}`" />
      <button class="btn-primary !py-1.5">บันทึกเรต</button>
    </form>
  </PageHeader>

  <div class="space-y-4 px-4">
    <p v-if="error" class="rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-800">{{ error }}</p>

    <!-- what is still owed, both parts together -->
    <section class="card bg-navy! text-white">
      <p class="text-xs opacity-80">ยังค้างต้องโอน (ทริป + เสื้อผ้า)</p>
      <p v-if="combined" class="mt-1 flex items-center gap-2 text-xl font-bold">
        {{ PEOPLE[combined.from] }} <ArrowRight class="size-5" /> {{ PEOPLE[combined.to] }}
        <span class="ml-auto text-2xl">{{ baht(combined.satang) }}</span>
      </p>
      <p v-else class="mt-1 text-xl font-bold">ไม่มียอดค้าง 🎉</p>

      <div class="mt-3 flex items-center justify-between rounded-xl bg-white/10 px-3 py-2">
        <span class="text-xs opacity-85">โอนกันแล้ว</span>
        <span v-if="combinedPaid" class="text-sm font-bold text-emerald-300">{{ PEOPLE[combinedPaid.from] }} → {{ PEOPLE[combinedPaid.to] }} {{ baht(combinedPaid.satang) }}</span>
        <span v-else class="text-sm opacity-70">ยังไม่มี</span>
      </div>

      <table class="mt-3 w-full text-xs">
        <thead class="opacity-70"><tr><th class="pb-1 text-left font-normal"></th><th class="pb-1 text-right font-normal">ยังค้าง</th><th class="pb-1 text-right font-normal">โอนแล้ว</th></tr></thead>
        <tbody class="opacity-90">
          <tr><td class="py-0.5">ในทริป</td><td class="text-right">{{ fmtT(summary.netAum, '—') }}</td><td class="text-right text-emerald-300">{{ fmtT(summary.settledNetAum, '—') }}</td></tr>
          <tr v-if="clothesOn"><td class="py-0.5">เสื้อผ้า</td><td class="text-right">{{ fmtT(cm.netAum, '—') }}</td><td class="text-right text-emerald-300">{{ fmtT(cm.settledNetAum, '—') }}</td></tr>
        </tbody>
      </table>
      <p class="mt-2 text-[0.7rem] opacity-70">โอนคืนรายการไหนแล้ว ให้ติ๊ก ✓ ที่รายการนั้น → ย้ายจาก "ยังค้าง" ไป "โอนแล้ว"</p>
    </section>

    <div class="grid grid-cols-2 gap-1 rounded-2xl bg-white p-1 ring-1 ring-black/5">
      <button class="rounded-xl py-2 text-sm font-semibold" :class="tab === 'trip' ? 'bg-sea text-white' : 'text-mute'" @click="setTab('trip')">ในทริป</button>
      <button class="rounded-xl py-2 text-sm font-semibold" :class="tab === 'clothes' ? 'bg-sea text-white' : 'text-mute'" @click="setTab('clothes')">เสื้อผ้า</button>
    </div>

    <!-- ===== trip expenses ===== -->
    <template v-if="tab === 'trip'">
      <section class="grid grid-cols-2 gap-2">
        <div class="card col-span-2 !p-3">
          <p class="text-xs text-mute">ค่าใช้จ่ายในทริปทั้งหมด</p>
          <p class="text-2xl font-bold text-navy">{{ baht(summary.totalSatang) }}</p>
          <p class="text-xs text-mute">เฉลี่ยคนละ {{ baht(Math.round(summary.totalSatang / 2)) }}</p>
          <p v-if="summary.unassignedCount" class="mt-1 text-xs text-amber-700">
            มี {{ summary.unassignedCount }} รายการ ({{ baht(summary.unassignedSatang) }}) ยังไม่ระบุว่าใครจ่าย — ยังไม่นับในยอดค้าง
          </p>
        </div>
        <div class="card !p-3">
          <p class="text-xs text-mute">ยังค้าง</p>
          <p class="font-bold" :class="summary.transfer ? 'text-brick' : 'text-mute'">{{ summary.transfer ? baht(summary.transfer.satang) : '฿0.00' }}</p>
          <p v-if="summary.transfer" class="text-xs text-mute">{{ PEOPLE[summary.transfer.from] }} → {{ PEOPLE[summary.transfer.to] }}</p>
        </div>
        <div class="card !p-3">
          <p class="text-xs text-mute">โอนแล้ว</p>
          <p class="font-bold text-emerald-700">{{ summary.settledTransfer ? baht(summary.settledTransfer.satang) : '฿0.00' }}</p>
          <p v-if="summary.settledTransfer" class="text-xs text-mute">{{ PEOPLE[summary.settledTransfer.from] }} → {{ PEOPLE[summary.settledTransfer.to] }} · {{ summary.settledCount }} รายการ</p>
        </div>
        <div v-for="(n, p) in PEOPLE" :key="p" class="card !p-3">
          <p class="text-xs text-mute">{{ n }} จ่ายไป</p>
          <p class="text-lg font-bold">{{ baht(summary.paid[p]) }}</p>
          <p class="text-xs text-mute">ส่วนของ{{ n }} {{ baht(summary.share[p]) }}</p>
        </div>
      </section>

      <section v-if="summary.totalSatang" class="card !p-3">
        <div class="flex h-2.5 overflow-hidden rounded-full bg-sand">
          <div v-for="(c, k) in CATEGORIES" :key="k" :style="{ width: (summary.byCategory[k] / summary.totalSatang * 100) + '%', background: c.color }" />
        </div>
        <div class="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs">
          <span v-for="(c, k) in CATEGORIES" v-show="summary.byCategory[k]" :key="k" class="flex items-center gap-1">
            <i class="inline-block size-2 rounded-full" :style="{ background: c.color }" /> {{ c.label }} {{ baht(summary.byCategory[k]) }}
          </span>
        </div>
      </section>

      <div class="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <button class="shrink-0 rounded-full px-3 py-1.5 text-sm ring-1" :class="filter === 'all' ? 'bg-ink text-white ring-transparent' : 'bg-white ring-black/10'" @click="filter = 'all'">ทั้งหมด</button>
        <button v-for="(c, k) in CATEGORIES" :key="k" class="shrink-0 rounded-full px-3 py-1.5 text-sm ring-1"
          :class="filter === k ? 'text-white ring-transparent' : 'bg-white ring-black/10'" :style="filter === k ? { background: c.color } : {}" @click="filter = k">{{ c.label }}</button>
      </div>

      <p v-if="loading" class="py-8 text-center text-sm text-mute">กำลังโหลด…</p>
      <p v-else-if="!filtered.length" class="py-8 text-center text-sm text-mute">ยังไม่มีรายการ กด + เพื่อเพิ่ม</p>
      <section v-for="[d, list] in groups" :key="d">
        <h3 class="mb-1.5 text-xs font-semibold text-mute">{{ showDate(d) }}</h3>
        <div class="card divide-y divide-black/5 !p-0">
          <div v-for="e in list" :key="e.id" class="flex w-full items-center gap-2 py-1 pr-3.5 pl-1.5" :class="e.settled ? 'opacity-60' : ''">
            <button v-if="dbFeatures.settled" class="grid size-10 shrink-0 place-items-center"
              :aria-label="e.settled ? 'เคลียร์แล้ว แตะเพื่อเปลี่ยนเป็นยังค้าง' : 'ยังค้าง แตะเพื่อติ๊กว่าเคลียร์แล้ว'" @click="toggleSettled(e)">
              <span class="grid size-6 place-items-center rounded-md ring-2" :class="e.settled ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white ring-black/25'">
                <Check v-if="e.settled" class="size-4" />
              </span>
            </button>
            <button class="flex min-w-0 flex-1 items-center gap-3 py-2 text-left active:opacity-70" @click="openEdit(e)">
              <i class="size-2.5 shrink-0 rounded-full" :style="{ background: CATEGORIES[e.category].color }" />
              <span class="min-w-0 flex-1">
                <span class="block truncate font-medium" :class="e.settled ? 'line-through' : ''">{{ e.title }}</span>
                <span class="block truncate text-xs text-mute">
                  {{ e.paid_by ? PEOPLE[e.paid_by] + 'จ่าย' : 'ยังไม่ระบุคนจ่าย' }} · {{ SPLITS[e.split] }}<template v-if="e.note"> · {{ e.note }}</template>
                </span>
              </span>
              <span class="shrink-0 text-right">
                <span class="block font-semibold">{{ sym(e.currency) }}{{ e.amount.toLocaleString('th-TH', { maximumFractionDigits: 2 }) }}</span>
                <span v-if="e.currency !== 'THB'" class="block text-xs text-mute">{{ baht(toSatang(e, trip.rate_to_thb)) }}</span>
                <span v-if="e.settled" class="block text-[0.65rem] font-semibold text-emerald-700">เคลียร์แล้ว</span>
              </span>
            </button>
          </div>
        </div>
      </section>
    </template>

    <!-- ===== clothes ===== -->
    <template v-else>
      <p v-if="!clothesReady || !dbFeatures.clothMoney" class="card text-sm text-mute">
        ค่าเสื้อผ้ายังไม่พร้อม — ต้องรัน SQL อัปเดตฐานข้อมูลก่อน
      </p>
      <template v-else>
        <section class="grid grid-cols-3 gap-2">
          <div class="card col-span-3 !p-3">
            <p class="text-xs text-mute">ค่าเสื้อผ้าทั้งหมด (รวมค่าส่ง)</p>
            <p class="text-2xl font-bold text-navy">{{ baht(cm.totalSatang) }}</p>
            <p v-if="unpriced" class="text-xs text-amber-700">ยังไม่ใส่ราคา {{ unpriced }} ชิ้น</p>
            <p v-if="cm.unassignedCount" class="text-xs text-amber-700">ยังไม่ระบุเจ้าของ {{ cm.unassignedCount }} ชิ้น ({{ baht(cm.byOwner.none) }}) — ยังไม่นับในยอดค้าง</p>
          </div>
          <div class="card !p-3"><p class="text-xs text-mute">ของอุ้ม</p><p class="font-bold">{{ baht(cm.byOwner.aum) }}</p></div>
          <div class="card !p-3"><p class="text-xs text-mute">ของทิว</p><p class="font-bold">{{ baht(cm.byOwner.tiw) }}</p></div>
          <div class="card !p-3"><p class="text-xs text-mute">ยอดรวม</p><p class="font-bold">{{ baht(cm.byOwner.aum + cm.byOwner.tiw) }}</p></div>
          <div class="card col-span-3 grid grid-cols-2 gap-2 !p-3">
            <div>
              <p class="text-xs text-mute">ยังค้าง</p>
              <p class="font-bold" :class="cm.transfer ? 'text-brick' : 'text-mute'">{{ cm.transfer ? baht(cm.transfer.satang) : '฿0.00' }}</p>
              <p v-if="cm.transfer" class="text-xs text-mute">{{ PEOPLE[cm.transfer.from] }} → {{ PEOPLE[cm.transfer.to] }}</p>
            </div>
            <div>
              <p class="text-xs text-mute">โอนแล้ว</p>
              <p class="font-bold text-emerald-700">{{ cm.settledTransfer ? baht(cm.settledTransfer.satang) : '฿0.00' }}</p>
              <p v-if="cm.settledTransfer" class="text-xs text-mute">{{ PEOPLE[cm.settledTransfer.from] }} → {{ PEOPLE[cm.settledTransfer.to] }}</p>
            </div>
          </div>
        </section>

        <section>
          <div class="mb-1.5 flex items-end justify-between">
            <h3 class="text-sm font-bold">รายการที่ต้องจ่ายคืนคนซื้อ</h3>
            <RouterLink :to="`${base}/outfits`" class="flex items-center gap-1 text-xs text-sea"><Shirt class="size-3.5" /> แก้ราคา/เจ้าของ</RouterLink>
          </div>
          <label v-if="cm.billable.length > 5" class="relative mb-2 block">
            <Search class="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-mute" />
            <input v-model="clothQuery" type="text" class="field !py-2 !pr-9 !pl-9 text-sm" placeholder="ค้นหาเสื้อผ้า เช่น ฮีท, 133" aria-label="ค้นหาเสื้อผ้า" enterkeyhint="search" />
            <button v-if="clothQuery" type="button" class="absolute top-1/2 right-2 -translate-y-1/2 rounded-full p-1 text-mute hover:bg-black/5" aria-label="ล้างคำค้นหา" @click="clothQuery = ''">
              <X class="size-4" />
            </button>
          </label>
          <p v-if="!cm.billable.length" class="card text-center text-sm text-mute">ไม่มีเสื้อผ้าที่ซื้อให้อีกคน</p>
          <p v-else-if="!billableSorted.length" class="card text-center text-sm text-mute">ไม่พบ "{{ clothQuery.trim() }}"</p>
          <div v-else class="card divide-y divide-black/5 !p-0">
            <div v-for="c in billableSorted" :key="c.id" class="flex items-center gap-2 py-1 pr-3.5 pl-1.5" :class="c.settled ? 'opacity-60' : ''">
              <button class="grid size-10 shrink-0 place-items-center" :aria-label="c.settled ? 'โอนแล้ว แตะเพื่อเปลี่ยนเป็นยังค้าง' : 'ยังค้าง แตะเพื่อติ๊กว่าโอนแล้ว'" @click="toggleCloth(c)">
                <span class="grid size-6 place-items-center rounded-md ring-2" :class="c.settled ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white ring-black/25'">
                  <Check v-if="c.settled" class="size-4" />
                </span>
              </button>
              <span class="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-sand">
                <img v-if="c.photo_url" :src="c.photo_url" alt="" class="size-full object-cover" loading="lazy" />
                <span v-else>{{ KINDS[c.kind].emoji }}</span>
              </span>
              <span class="min-w-0 flex-1 py-2">
                <span class="block truncate text-sm font-medium" :class="c.settled ? 'line-through' : ''">{{ c.name }}</span>
                <span class="block text-xs text-mute">ของ{{ PEOPLE[c.owner!] }} · {{ PEOPLE[c.paid_by] }}จ่าย</span>
              </span>
              <span class="shrink-0 text-sm font-semibold">{{ baht(Math.round((c.price ?? 0) * 100)) }}</span>
            </div>
          </div>
        </section>
      </template>
    </template>
  </div>

  <button v-if="tab === 'trip'" class="fixed right-5 bottom-24 z-30 grid size-14 place-items-center rounded-full bg-brick text-white shadow-lg active:scale-95" aria-label="เพิ่มรายการ" @click="openNew">
    <Plus class="size-7" />
  </button>

  <ExpenseForm v-if="formOpen" :expense="editing" :rate="trip.rate_to_thb" :local-currency="trip.currency" :show-settled="dbFeatures.settled" @save="onSave" @remove="onRemove" @close="formOpen = false" />
  <TripForm v-if="tripFormOpen" :trip="trip" @save="saveTrip" @remove="removeTrip" @close="tripFormOpen = false" />
</template>
