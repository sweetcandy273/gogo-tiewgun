<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { X } from 'lucide-vue-next'
import { CURRENCIES, type Trip, type TripInput } from '../lib/types'

const props = defineProps<{ trip: Trip | null }>()
const emit = defineEmits<{ save: [input: TripInput]; remove: []; close: [] }>()

const f = reactive({
  name: props.trip?.name ?? '',
  slug: props.trip?.slug ?? '',
  start_date: props.trip?.start_date ?? '',
  end_date: props.trip?.end_date ?? '',
  currency: props.trip?.currency ?? 'THB',
  rate: props.trip ? String(props.trip.rate_to_thb) : '1',
})
const slugTouched = ref(!!props.trip)
const confirmDelete = ref(false)
const touched = ref(false)

function autoSlug() {
  if (slugTouched.value) return
  const ascii = f.name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
  const year = f.start_date.slice(0, 4)
  f.slug = [ascii || 'trip', year].filter(Boolean).join('-').slice(0, 49)
}

const rateNum = computed(() => (f.currency === 'THB' ? 1 : Number(f.rate)))
const errors = computed(() => {
  const e: string[] = []
  if (!f.name.trim() || f.name.length > 80) e.push('ใส่ชื่อทริป (ไม่เกิน 80 ตัวอักษร)')
  if (!/^[a-z0-9][a-z0-9-]{1,48}$/.test(f.slug)) e.push('ลิงก์ทริปใช้ a-z 0-9 และ - (2–49 ตัว)')
  if (f.start_date && f.end_date && f.end_date < f.start_date) e.push('วันกลับต้องไม่ก่อนวันไป')
  if (!Number.isFinite(rateNum.value) || rateNum.value <= 0 || rateNum.value >= 100000) e.push('เรตไม่ถูกต้อง')
  return e
})

function submit() {
  touched.value = true
  if (errors.value.length) return
  emit('save', {
    name: f.name.trim(),
    slug: f.slug,
    start_date: f.start_date || null,
    end_date: f.end_date || null,
    currency: f.currency,
    rate_to_thb: Math.round(rateNum.value * 10000) / 10000,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" @click.self="emit('close')">
    <form class="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream p-5 sm:rounded-3xl"
          style="padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))" @submit.prevent="submit">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-bold">{{ trip ? 'แก้ไขทริป' : 'ทริปใหม่' }}</h2>
        <button type="button" class="rounded-full p-1.5 hover:bg-black/5" aria-label="ปิด" @click="emit('close')"><X class="size-5" /></button>
      </div>
      <div class="space-y-3">
        <div>
          <label class="label" for="tn">ชื่อทริป</label>
          <input id="tn" v-model="f.name" class="field" maxlength="80" placeholder="เช่น โตเกียว ฤดูใบไม้ผลิ" @input="autoSlug" />
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="label" for="ts">วันไป</label>
            <input id="ts" v-model="f.start_date" class="field" type="date" @change="autoSlug" />
          </div>
          <div>
            <label class="label" for="te">วันกลับ</label>
            <input id="te" v-model="f.end_date" class="field" type="date" />
          </div>
        </div>
        <div>
          <label class="label" for="tsl">ลิงก์ทริป</label>
          <div class="flex items-center gap-1 text-sm text-mute">
            <span>/t/</span>
            <input id="tsl" v-model="f.slug" class="field" maxlength="49" :disabled="!!trip" @input="slugTouched = true" />
          </div>
        </div>
        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="label" for="tc">สกุลเงินท้องถิ่น</label>
            <select id="tc" v-model="f.currency" class="field">
              <option v-for="(c, k) in CURRENCIES" :key="k" :value="k">{{ k }} · {{ c.name }}</option>
            </select>
          </div>
          <div v-if="f.currency !== 'THB'">
            <label class="label" for="tr">1 {{ f.currency }} = ? บาท</label>
            <input id="tr" v-model="f.rate" class="field" inputmode="decimal" />
          </div>
        </div>

        <ul v-if="touched && errors.length" class="list-disc pl-5 text-sm text-brick">
          <li v-for="e in errors" :key="e">{{ e }}</li>
        </ul>
        <button class="btn-primary w-full !py-3 text-base">บันทึก</button>
        <template v-if="trip">
          <button v-if="!confirmDelete" type="button" class="btn-ghost w-full !text-brick" @click="confirmDelete = true">ลบทริปนี้</button>
          <div v-else class="space-y-2">
            <p class="text-sm text-brick">ลบทริปและค่าใช้จ่ายทั้งหมดของทริปนี้ กู้คืนไม่ได้</p>
            <div class="flex gap-2">
              <button type="button" class="btn-ghost flex-1" @click="confirmDelete = false">ไม่ลบ</button>
              <button type="button" class="btn-danger flex-1" @click="emit('remove')">ยืนยันลบ</button>
            </div>
          </div>
        </template>
      </div>
    </form>
  </div>
</template>
