<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { X } from 'lucide-vue-next'
import { CATEGORIES, CURRENCIES, PEOPLE, SPLITS, type Category, type Expense, type ExpenseInput, type Person, type Split } from '../lib/types'

type Input = Omit<ExpenseInput, 'trip_id'>
const props = defineProps<{ expense: Expense | null; rate: number; localCurrency: string }>()
const emit = defineEmits<{ save: [input: Input]; remove: []; close: [] }>()
const currencies = props.localCurrency === 'THB' ? ['THB'] : [props.localCurrency, 'THB']

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const f = reactive({
  spent_on: props.expense?.spent_on ?? today(),
  category: (props.expense?.category ?? 'food') as Category,
  title: props.expense?.title ?? '',
  currency: props.expense?.currency ?? props.localCurrency,
  amount: props.expense ? String(props.expense.amount) : '',
  paid_by: (props.expense?.paid_by ?? '') as Person | '',
  split: (props.expense?.split ?? 'half') as Split,
  note: props.expense?.note ?? '',
  is_paid: props.expense?.is_paid ?? true,
})
const confirmDelete = ref(false)
const touched = ref(false)

const amountNum = computed(() => Number(f.amount))
const errors = computed(() => {
  const e: string[] = []
  if (!f.title.trim()) e.push('ใส่ชื่อรายการ')
  if (f.title.length > 200) e.push('ชื่อรายการยาวเกินไป')
  if (!f.amount || !Number.isFinite(amountNum.value) || amountNum.value < 0) e.push('จำนวนเงินไม่ถูกต้อง')
  if (amountNum.value >= 10_000_000) e.push('จำนวนเงินมากเกินไป')
  if (!/^\d{4}-\d{2}-\d{2}$/.test(f.spent_on)) e.push('เลือกวันที่')
  if (f.note.length > 500) e.push('หมายเหตุยาวเกินไป')
  return e
})
const thbPreview = computed(() =>
  f.currency !== 'THB' && Number.isFinite(amountNum.value) && amountNum.value > 0
    ? `≈ ฿${(amountNum.value * props.rate).toFixed(2)} (เรต ${props.rate})` : '')

function submit() {
  touched.value = true
  if (errors.value.length) return
  emit('save', {
    spent_on: f.spent_on,
    category: f.category,
    title: f.title.trim(),
    currency: f.currency,
    amount: Math.round(amountNum.value * 100) / 100,
    paid_by: f.paid_by || null,
    split: f.split,
    note: f.note.trim() || null,
    is_paid: f.is_paid,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" @click.self="emit('close')">
    <form class="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream p-5 sm:rounded-3xl"
          style="padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))" @submit.prevent="submit">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-bold">{{ expense ? 'แก้ไขรายการ' : 'เพิ่มรายการ' }}</h2>
        <button type="button" class="rounded-full p-1.5 hover:bg-black/5" aria-label="ปิด" @click="emit('close')"><X class="size-5" /></button>
      </div>

      <div class="space-y-3">
        <div>
          <span class="label">หมวด</span>
          <div class="flex flex-wrap gap-1.5">
            <button v-for="(c, k) in CATEGORIES" :key="k" type="button"
              class="rounded-full px-3 py-1.5 text-sm font-medium ring-1"
              :class="f.category === k ? 'text-white ring-transparent' : 'bg-white text-ink ring-black/10'"
              :style="f.category === k ? { background: c.color } : {}" @click="f.category = k">{{ c.label }}</button>
          </div>
        </div>

        <div>
          <label class="label" for="t">รายการ</label>
          <input id="t" v-model="f.title" class="field" maxlength="200" placeholder="เช่น ค่ารถ, มื้อเที่ยง" />
        </div>

        <div class="grid grid-cols-[1fr_auto] gap-2">
          <div>
            <label class="label" for="a">จำนวนเงิน</label>
            <input id="a" v-model="f.amount" class="field" inputmode="decimal" placeholder="0.00" />
          </div>
          <div>
            <span class="label">สกุล</span>
            <div class="flex overflow-hidden rounded-xl ring-1 ring-black/10">
              <button v-for="c in currencies" :key="c" type="button" class="px-3.5 py-2.5 text-sm font-semibold"
                :class="f.currency === c ? 'bg-navy text-white' : 'bg-white'" @click="f.currency = c">{{ CURRENCIES[c]?.symbol ?? c }} {{ CURRENCIES[c]?.name ?? '' }}</button>
            </div>
          </div>
        </div>
        <p v-if="thbPreview" class="-mt-1 text-xs text-mute">{{ thbPreview }}</p>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="label" for="d">วันที่</label>
            <input id="d" v-model="f.spent_on" class="field" type="date" />
          </div>
          <div>
            <label class="label" for="p">ใครจ่าย</label>
            <select id="p" v-model="f.paid_by" class="field">
              <option value="">ยังไม่ระบุ</option>
              <option v-for="(n, k) in PEOPLE" :key="k" :value="k">{{ n }}</option>
            </select>
          </div>
        </div>

        <div>
          <span class="label">ของใคร</span>
          <div class="grid grid-cols-3 gap-1.5">
            <button v-for="(s, k) in SPLITS" :key="k" type="button" class="rounded-xl px-2 py-2 text-sm font-medium ring-1"
              :class="f.split === k ? 'bg-sea text-white ring-transparent' : 'bg-white ring-black/10'" @click="f.split = k">{{ s }}</button>
          </div>
        </div>

        <label class="flex items-center gap-3 rounded-xl bg-white px-3 py-2.5 ring-1 ring-black/10">
          <input v-model="f.is_paid" type="checkbox" class="size-5 accent-[#1b4965]" />
          <span class="text-sm font-medium">จ่ายแล้ว</span>
          <span class="ml-auto text-xs text-mute">{{ f.is_paid ? 'นับในยอดรวมและยอดโอน' : 'ยังไม่จ่าย · เก็บไว้เป็นรายการรอจ่าย' }}</span>
        </label>

        <div>
          <label class="label" for="n">หมายเหตุ</label>
          <input id="n" v-model="f.note" class="field" maxlength="500" placeholder="ไม่ใส่ก็ได้" />
        </div>

        <ul v-if="touched && errors.length" class="list-disc pl-5 text-sm text-brick">
          <li v-for="e in errors" :key="e">{{ e }}</li>
        </ul>

        <button class="btn-primary w-full !py-3 text-base">บันทึก</button>

        <template v-if="expense">
          <button v-if="!confirmDelete" type="button" class="btn-ghost w-full !text-brick" @click="confirmDelete = true">ลบรายการนี้</button>
          <div v-else class="flex gap-2">
            <button type="button" class="btn-ghost flex-1" @click="confirmDelete = false">ไม่ลบ</button>
            <button type="button" class="btn-danger flex-1" @click="emit('remove')">ยืนยันลบ</button>
          </div>
        </template>
      </div>
    </form>
  </div>
</template>
