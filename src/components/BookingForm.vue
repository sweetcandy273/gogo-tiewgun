<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { X } from 'lucide-vue-next'
import { BOOKING_KINDS, type Booking, type BookingInput, type BookingKind } from '../lib/types'
import { cleanBooking, VAULT_LIMITS } from '../lib/vault'

const props = defineProps<{ booking: Booking | null; saving?: boolean }>()
const emit = defineEmits<{ save: [input: BookingInput]; remove: []; close: [] }>()

const f = reactive({
  kind: (props.booking?.kind ?? 'hotel') as BookingKind,
  title: props.booking?.title ?? '',
  ref: props.booking?.ref ?? '',
  on_date: props.booking?.on_date ?? '',
  details: props.booking?.details ?? '',
})
const touched = ref(false)
const confirmDelete = ref(false)
const result = computed(() => cleanBooking({ id: props.booking?.id, ...f }))
const errors = computed(() => (result.value.ok ? [] : result.value.errors))

function submit() {
  touched.value = true
  if (result.value.ok) emit('save', result.value.input)
}
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" @click.self="emit('close')">
    <form class="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream p-5 sm:rounded-3xl"
          style="padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))" @submit.prevent="submit">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-bold">{{ booking ? 'แก้ไขการจอง' : 'เพิ่มการจอง' }}</h2>
        <button type="button" class="rounded-full p-1.5 hover:bg-black/5" aria-label="ปิด" @click="emit('close')"><X class="size-5" /></button>
      </div>

      <div class="space-y-3">
        <div>
          <span class="label">หมวด</span>
          <div class="flex flex-wrap gap-1.5">
            <button v-for="(k, id) in BOOKING_KINDS" :key="id" type="button" class="rounded-full px-3 py-1.5 text-sm font-medium ring-1"
                    :class="f.kind === id ? 'bg-navy text-white ring-transparent' : 'bg-white text-ink ring-black/10'" @click="f.kind = id">{{ k.icon }} {{ k.label }}</button>
          </div>
        </div>

        <div>
          <label class="label" for="bk-title">ชื่อรายการ</label>
          <input id="bk-title" v-model="f.title" class="field" :maxlength="VAULT_LIMITS.title" placeholder="เช่น CZ3573 กว่างโจว → ชิงเต่า" />
        </div>

        <div class="grid grid-cols-2 gap-2">
          <div>
            <label class="label" for="bk-ref">เลขจอง / ออเดอร์</label>
            <input id="bk-ref" v-model="f.ref" class="field font-mono" :maxlength="VAULT_LIMITS.ref" autocapitalize="characters" autocomplete="off" placeholder="ไม่ใส่ก็ได้" />
          </div>
          <div>
            <label class="label" for="bk-date">วันที่</label>
            <input id="bk-date" v-model="f.on_date" class="field" type="date" />
          </div>
        </div>

        <div>
          <label class="label" for="bk-details">รายละเอียด</label>
          <textarea id="bk-details" v-model="f.details" class="field min-h-28" :maxlength="VAULT_LIMITS.details"
                    placeholder="เวลา ที่อยู่ เบอร์ติดต่อ เงื่อนไขยกเลิก ฯลฯ" />
        </div>

        <p class="rounded-xl bg-sand px-3 py-2 text-xs text-ink/80">อย่าใส่เลขพาสปอร์ตหรือเลขบัตรเครดิตที่นี่ รหัส 6 หลักก็ยังไม่แข็งแรงพอ</p>

        <ul v-if="touched && errors.length" class="list-disc pl-5 text-sm text-brick">
          <li v-for="e in errors" :key="e">{{ e }}</li>
        </ul>

        <button class="btn-primary w-full !py-3 text-base" :disabled="saving">{{ saving ? 'กำลังบันทึก…' : 'บันทึก' }}</button>

        <template v-if="booking">
          <button v-if="!confirmDelete" type="button" class="btn-ghost w-full !text-brick" @click="confirmDelete = true">ลบรายการนี้</button>
          <div v-else class="flex gap-2">
            <button type="button" class="btn-ghost flex-1" @click="confirmDelete = false">ไม่ลบ</button>
            <button type="button" class="btn-danger flex-1" :disabled="saving" @click="emit('remove')">ยืนยันลบ</button>
          </div>
        </template>
      </div>
    </form>
  </div>
</template>
