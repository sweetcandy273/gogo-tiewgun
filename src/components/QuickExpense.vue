<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import { X } from 'lucide-vue-next'
import { showToast } from '../lib/copy'
import { me, setMe } from '../lib/me'
import { isNetworkError, queueExpense } from '../lib/outbox'
import { errMessage, repo } from '../lib/repo'
import { CATEGORIES, CURRENCIES, PEOPLE, SPLITS, type Category, type ExpenseInput, type Person, type Split, type Trip } from '../lib/types'

const props = defineProps<{ trip: Trip }>()
const emit = defineEmits<{ close: [] }>()

function today(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const currencies = props.trip.currency === 'THB' ? ['THB'] : [props.trip.currency, 'THB']
const amount = ref('')
const currency = ref(props.trip.currency)
const category = ref<Category>('food')
const title = ref('')
const paidBy = ref<Person | ''>(me.value)
const split = ref<Split>('half')
const saving = ref(false)
const error = ref<string | null>(null)
const amountEl = ref<HTMLInputElement | null>(null)

const amountNum = computed(() => Number(amount.value.replace(/,/g, '')))
const valid = computed(() => amount.value.trim() !== '' && Number.isFinite(amountNum.value) && amountNum.value > 0 && amountNum.value < 10_000_000 && !!paidBy.value)
const thb = computed(() =>
  currency.value !== 'THB' && Number.isFinite(amountNum.value) && amountNum.value > 0
    ? `≈ ฿${(amountNum.value * props.trip.rate_to_thb).toFixed(2)}` : '')

onMounted(() => { void nextTick(() => amountEl.value?.focus()) })

async function save() {
  error.value = null
  if (!valid.value || !paidBy.value || saving.value) {
    error.value = !paidBy.value ? 'เลือกว่าใครจ่าย' : 'ใส่จำนวนเงิน'
    return
  }
  setMe(paidBy.value)
  const input: ExpenseInput = {
    trip_id: props.trip.id,
    spent_on: today(),
    category: category.value,
    title: title.value.trim().slice(0, 200) || CATEGORIES[category.value].label,
    currency: currency.value,
    amount: Math.round(amountNum.value * 100) / 100,
    paid_by: paidBy.value,
    split: split.value,
    note: null,
    settled: false,
  }
  const label = `${CURRENCIES[input.currency]?.symbol ?? ''}${input.amount} · ${input.title}`

  if (!navigator.onLine) return queue(input, label)
  saving.value = true
  try {
    await repo.createExpense(input)
    showToast(`บันทึกแล้ว ${label}`)
    emit('close')
  } catch (e) {
    if (isNetworkError(e, navigator.onLine)) queue(input, label)
    else error.value = errMessage(e)
  } finally {
    saving.value = false
  }
}

function queue(input: ExpenseInput, label: string) {
  if (queueExpense(input)) {
    showToast(`ไม่มีเน็ต · เก็บไว้ในเครื่องแล้ว ${label}`)
    emit('close')
  } else {
    error.value = 'บันทึกในเครื่องไม่ได้ (พื้นที่เต็มหรือถูกบล็อก)'
  }
}
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" @click.self="emit('close')">
    <form class="w-full max-w-lg rounded-t-3xl bg-cream p-5 sm:rounded-3xl" style="padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))"
          @submit.prevent="save">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="text-lg font-bold">จดค่าใช้จ่ายด่วน</h2>
        <button type="button" class="rounded-full p-1.5 hover:bg-black/5" aria-label="ปิด" @click="emit('close')"><X class="size-5" /></button>
      </div>

      <div class="space-y-3">
        <div class="flex items-stretch gap-2">
          <input ref="amountEl" v-model="amount" class="field min-w-0 flex-1 !text-3xl font-bold" inputmode="decimal" placeholder="0" aria-label="จำนวนเงิน" />
          <div class="flex overflow-hidden rounded-xl ring-1 ring-black/10">
            <button v-for="c in currencies" :key="c" type="button" class="px-3.5 text-lg font-bold"
                    :class="currency === c ? 'bg-navy text-white' : 'bg-white'" @click="currency = c">{{ CURRENCIES[c]?.symbol ?? c }}</button>
          </div>
        </div>
        <p v-if="thb" class="-mt-1.5 text-xs text-mute">{{ thb }} (เรต {{ trip.rate_to_thb }})</p>

        <div class="flex flex-wrap gap-1.5">
          <button v-for="(c, k) in CATEGORIES" :key="k" type="button" class="rounded-full px-3 py-1.5 text-sm font-medium ring-1"
                  :class="category === k ? 'text-white ring-transparent' : 'bg-white ring-black/10'"
                  :style="category === k ? { background: c.color } : {}" @click="category = k">{{ c.label }}</button>
        </div>

        <input v-model="title" class="field" maxlength="200" :placeholder="`ชื่อรายการ (ไม่ใส่ = ${CATEGORIES[category].label})`" aria-label="ชื่อรายการ" />

        <div class="grid grid-cols-2 gap-2">
          <div>
            <span class="label">ใครจ่าย</span>
            <div class="grid grid-cols-2 gap-1.5">
              <button v-for="(n, k) in PEOPLE" :key="k" type="button" class="rounded-xl py-2 text-sm font-semibold ring-1"
                      :class="paidBy === k ? 'bg-navy text-white ring-transparent' : 'bg-white ring-black/10'" @click="paidBy = k">{{ n }}</button>
            </div>
          </div>
          <div>
            <span class="label">ของใคร</span>
            <select v-model="split" class="field !py-2">
              <option v-for="(s, k) in SPLITS" :key="k" :value="k">{{ s }}</option>
            </select>
          </div>
        </div>

        <p v-if="error" class="text-sm text-brick">{{ error }}</p>
        <button class="btn-primary w-full !py-3 text-base" :disabled="saving">{{ saving ? 'กำลังบันทึก…' : 'บันทึก' }}</button>
        <p class="text-center text-xs text-mute">วันที่ = วันนี้ · แก้ไขรายละเอียดเพิ่มได้ในหน้าค่าใช้จ่าย</p>
      </div>
    </form>
  </div>
</template>
