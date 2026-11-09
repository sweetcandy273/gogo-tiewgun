<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { Camera, X } from 'lucide-vue-next'
import { compressImage } from '../lib/image'
import { KINDS, PEOPLE, type Cloth, type ClothKind, type Person } from '../lib/types'

export interface ClothFormResult {
  name: string
  owner: Person | null
  kind: ClothKind
  note: string | null
  photo: Blob | null // new photo to upload, if any
  clearPhoto: boolean
}

const props = defineProps<{ cloth: Cloth | null; defaultOwner: Person | null; busy: boolean }>()
const emit = defineEmits<{ save: [r: ClothFormResult]; remove: []; close: [] }>()

const f = reactive({
  name: props.cloth?.name ?? '',
  owner: (props.cloth?.owner ?? props.defaultOwner ?? '') as Person | '',
  kind: (props.cloth?.kind ?? 'top') as ClothKind,
  note: props.cloth?.note ?? '',
})
const photo = ref<Blob | null>(null)
const preview = ref<string | null>(props.cloth?.photo_url ?? null)
const clearPhoto = ref(false)
const photoErr = ref<string | null>(null)
const processing = ref(false)
const confirmDelete = ref(false)
const touched = ref(false)
let objectUrl: string | null = null
onBeforeUnmount(() => { if (objectUrl) URL.revokeObjectURL(objectUrl) })

async function onFile(ev: Event) {
  const input = ev.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  photoErr.value = null
  processing.value = true
  try {
    const blob = await compressImage(file)
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    objectUrl = URL.createObjectURL(blob)
    photo.value = blob
    preview.value = objectUrl
    clearPhoto.value = false
  } catch (e) {
    photoErr.value = e instanceof Error ? e.message : 'ใช้รูปนี้ไม่ได้'
  } finally {
    processing.value = false
  }
}
function dropPhoto() {
  photo.value = null
  preview.value = null
  clearPhoto.value = !!props.cloth?.photo_url
}

const errors = computed(() => {
  const e: string[] = []
  if (!f.name.trim() || f.name.length > 120) e.push('ใส่ชื่อเสื้อผ้า (ไม่เกิน 120 ตัวอักษร)')
  if (f.note.length > 300) e.push('หมายเหตุยาวเกินไป')
  return e
})

function submit() {
  touched.value = true
  if (errors.value.length || processing.value || props.busy) return
  emit('save', {
    name: f.name.trim(), owner: f.owner || null, kind: f.kind, note: f.note.trim() || null,
    photo: photo.value, clearPhoto: clearPhoto.value,
  })
}
</script>

<template>
  <div class="fixed inset-0 z-40 flex items-end justify-center bg-black/40 sm:items-center" @click.self="emit('close')">
    <form class="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-cream p-5 sm:rounded-3xl"
          style="padding-bottom: calc(1.25rem + env(safe-area-inset-bottom))" @submit.prevent="submit">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-lg font-bold">{{ cloth ? 'แก้ไขเสื้อผ้า' : 'เพิ่มเสื้อผ้า' }}</h2>
        <button type="button" class="rounded-full p-1.5 hover:bg-black/5" aria-label="ปิด" @click="emit('close')"><X class="size-5" /></button>
      </div>

      <div class="space-y-3">
        <div class="flex items-start gap-3">
          <label class="relative grid size-28 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-2xl bg-sand ring-1 ring-black/10">
            <img v-if="preview" :src="preview" alt="" class="size-full object-cover" />
            <span v-else class="flex flex-col items-center gap-1 text-xs text-mute"><Camera class="size-6" /> {{ processing ? 'กำลังย่อรูป…' : 'ถ่าย/เลือกรูป' }}</span>
            <input type="file" accept="image/*" class="sr-only" @change="onFile" />
          </label>
          <div class="min-w-0 flex-1 space-y-2">
            <div>
              <label class="label" for="cn">ชื่อ</label>
              <input id="cn" v-model="f.name" class="field" maxlength="120" placeholder="เช่น ไหมพรมครีมเปีย" />
            </div>
            <button v-if="preview" type="button" class="text-xs text-brick underline" @click="dropPhoto">เอารูปออก</button>
            <p v-if="photoErr" class="text-xs text-brick">{{ photoErr }}</p>
          </div>
        </div>

        <div>
          <span class="label">ของใคร</span>
          <div class="grid grid-cols-3 gap-1.5">
            <button v-for="o in (['aum', 'tiw', ''] as const)" :key="o" type="button" class="rounded-xl px-2 py-2 text-sm font-medium ring-1"
              :class="f.owner === o ? 'bg-sea text-white ring-transparent' : 'bg-white ring-black/10'" @click="f.owner = o">
              {{ o ? PEOPLE[o] : 'ยังไม่ระบุ' }}
            </button>
          </div>
        </div>

        <div>
          <span class="label">ประเภท</span>
          <div class="flex flex-wrap gap-1.5">
            <button v-for="(k, key) in KINDS" :key="key" type="button" class="rounded-full px-3 py-1.5 text-sm ring-1"
              :class="f.kind === key ? 'bg-navy text-white ring-transparent' : 'bg-white ring-black/10'" @click="f.kind = key">
              {{ k.emoji }} {{ k.label }}
            </button>
          </div>
        </div>

        <div>
          <label class="label" for="cnote">หมายเหตุ</label>
          <input id="cnote" v-model="f.note" class="field" maxlength="300" placeholder="ไม่ใส่ก็ได้" />
        </div>

        <ul v-if="touched && errors.length" class="list-disc pl-5 text-sm text-brick">
          <li v-for="e in errors" :key="e">{{ e }}</li>
        </ul>
        <button class="btn-primary w-full !py-3 text-base" :disabled="busy || processing">{{ busy ? 'กำลังบันทึก…' : 'บันทึก' }}</button>

        <template v-if="cloth">
          <button v-if="!confirmDelete" type="button" class="btn-ghost w-full !text-brick" @click="confirmDelete = true">ลบชิ้นนี้</button>
          <div v-else class="flex gap-2">
            <button type="button" class="btn-ghost flex-1" @click="confirmDelete = false">ไม่ลบ</button>
            <button type="button" class="btn-danger flex-1" @click="emit('remove')">ยืนยันลบ</button>
          </div>
        </template>
      </div>
    </form>
  </div>
</template>
