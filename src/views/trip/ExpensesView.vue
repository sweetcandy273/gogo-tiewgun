<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowRight, Check, Pencil, Plus, RefreshCw } from 'lucide-vue-next'
import PageHeader from '../../components/PageHeader.vue'
import ExpenseForm from '../../components/ExpenseForm.vue'
import TripForm from '../../components/TripForm.vue'
import { showToast } from '../../lib/copy'
import { errMessage, repo } from '../../lib/repo'
import { baht, toSatang } from '../../lib/settle'
import { useTrip } from '../../lib/tripContext'
import { CATEGORIES, PEOPLE, SPLITS, sym, type Category, type Expense, type ExpenseInput, type TripInput } from '../../lib/types'
import { useExpenses } from '../../lib/useExpenses'

const { trip } = useTrip()
const { items, loading, error, summary, load, create, update, remove, setRate } = useExpenses(trip)
const router = useRouter()

const editing = ref<Expense | null>(null)
const formOpen = ref(false)
const tripFormOpen = ref(false)
const filter = ref<Category | 'all'>('all')
const rateInput = ref('')
const rateOpen = ref(false)
const isLocal = computed(() => trip.value.currency !== 'THB')

const filtered = computed(() => filter.value === 'all' ? items.value : items.value.filter((e) => e.category === filter.value))
const groups = computed(() => {
  const m = new Map<string, Expense[]>()
  for (const e of filtered.value) m.set(e.spent_on, [...(m.get(e.spent_on) ?? []), e])
  return [...m.entries()]
})
const dateFmt = new Intl.DateTimeFormat('th-TH', { weekday: 'short', day: 'numeric', month: 'short' })
const showDate = (d: string) => dateFmt.format(new Date(d + 'T00:00:00'))

async function togglePaid(e: Expense) {
  const { id, created_at: _c, updated_at: _u, ...rest } = e
  const ok = await update(id, { ...rest, is_paid: !e.is_paid })
  if (ok) showToast(e.is_paid ? 'ย้ายไปรอจ่าย' : 'ติ๊กจ่ายแล้ว')
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
</script>

<template>
  <PageHeader kicker="EXPENSES" :title="`ค่าใช้จ่าย · ${trip.name}`" accent="#2F7FB3">
    <div class="mt-2 flex flex-wrap items-center gap-2 text-xs text-mute">
      <button v-if="isLocal" class="underline decoration-dotted" @click="rateOpen = !rateOpen; rateInput = String(trip.rate_to_thb)">
        1 {{ trip.currency }} = ฿{{ trip.rate_to_thb }}
      </button>
      <span v-if="isLocal">·</span>
      <button class="flex items-center gap-1" @click="load()"><RefreshCw class="size-3.5" /> รีเฟรช</button>
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

    <section class="grid grid-cols-2 gap-2">
      <div class="card col-span-2 bg-navy! text-white">
        <p class="text-xs opacity-80">รวมทั้งหมด</p>
        <p class="text-3xl font-bold">{{ baht(summary.totalSatang) }}</p>
        <p class="mt-1 text-xs opacity-80">เฉลี่ยคนละ {{ baht(Math.round(summary.totalSatang / 2)) }}</p>
        <p v-if="summary.unpaidCount" class="mt-1 text-xs text-amber-200">รอจ่ายอีก {{ summary.unpaidCount }} รายการ · {{ baht(summary.unpaidSatang) }} (ยังไม่นับ)</p>
      </div>
      <div v-for="(n, p) in PEOPLE" :key="p" class="card !p-3">
        <p class="text-xs text-mute">{{ n }} จ่ายไป</p>
        <p class="text-lg font-bold">{{ baht(summary.paid[p]) }}</p>
        <p class="text-xs text-mute">ส่วนของ{{ n }} {{ baht(summary.share[p]) }}</p>
      </div>
      <div class="card col-span-2 !p-3">
        <p v-if="summary.transfer" class="flex items-center gap-2 font-semibold">
          {{ PEOPLE[summary.transfer.from] }} <ArrowRight class="size-4 text-brick" /> {{ PEOPLE[summary.transfer.to] }}
          <span class="ml-auto text-lg text-brick">{{ baht(summary.transfer.satang) }}</span>
        </p>
        <p v-else class="font-semibold text-emerald-700">เคลียร์กันพอดี ไม่ต้องโอน 🎉</p>
        <p v-if="summary.unassignedCount" class="mt-1 text-xs text-amber-700">
          มี {{ summary.unassignedCount }} รายการ ({{ baht(summary.unassignedSatang) }}) ยังไม่ระบุว่าใครจ่าย — ยังไม่นับในยอดโอน
        </p>
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
        <div v-for="e in list" :key="e.id" class="flex w-full items-center gap-2 py-1 pr-3.5 pl-1.5" :class="e.is_paid ? '' : 'bg-amber-50/70'">
          <button class="grid size-10 shrink-0 place-items-center" :aria-label="e.is_paid ? 'จ่ายแล้ว แตะเพื่อเปลี่ยนเป็นยังไม่จ่าย' : 'ยังไม่จ่าย แตะเพื่อติ๊กจ่ายแล้ว'" @click="togglePaid(e)">
            <span class="grid size-6 place-items-center rounded-md ring-2" :class="e.is_paid ? 'bg-emerald-600 text-white ring-emerald-600' : 'bg-white ring-black/25'">
              <Check v-if="e.is_paid" class="size-4" />
            </span>
          </button>
          <button class="flex min-w-0 flex-1 items-center gap-3 py-2 text-left active:opacity-70" @click="openEdit(e)">
          <i class="size-2.5 shrink-0 rounded-full" :style="{ background: CATEGORIES[e.category].color }" />
          <span class="min-w-0 flex-1">
            <span class="block truncate font-medium">{{ e.title }}</span>
            <span class="block truncate text-xs text-mute">
              {{ e.paid_by ? PEOPLE[e.paid_by] + 'จ่าย' : 'ยังไม่ระบุคนจ่าย' }} · {{ SPLITS[e.split] }}<template v-if="e.note"> · {{ e.note }}</template>
            </span>
          </span>
          <span class="shrink-0 text-right">
            <span class="block font-semibold">{{ sym(e.currency) }}{{ e.amount.toLocaleString('th-TH', { maximumFractionDigits: 2 }) }}</span>
            <span v-if="e.currency !== 'THB'" class="block text-xs text-mute">{{ baht(toSatang(e, trip.rate_to_thb)) }}</span>
            <span v-if="!e.is_paid" class="block text-[0.65rem] font-semibold text-amber-700">รอจ่าย</span>
          </span>
          </button>
        </div>
      </div>
    </section>
  </div>

  <button class="fixed right-5 bottom-24 z-30 grid size-14 place-items-center rounded-full bg-brick text-white shadow-lg active:scale-95" aria-label="เพิ่มรายการ" @click="openNew">
    <Plus class="size-7" />
  </button>

  <ExpenseForm v-if="formOpen" :expense="editing" :rate="trip.rate_to_thb" :local-currency="trip.currency" @save="onSave" @remove="onRemove" @close="formOpen = false" />
  <TripForm v-if="tripFormOpen" :trip="trip" @save="saveTrip" @remove="removeTrip" @close="tripFormOpen = false" />
</template>
