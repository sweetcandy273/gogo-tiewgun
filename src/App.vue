<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { RouterView } from 'vue-router'
import { CarTaxiFront, CloudOff } from 'lucide-vue-next'
import DriverCard from './components/DriverCard.vue'
import { showToast, toast } from './lib/copy'
import { driverTarget, showDriver } from './lib/driver'
import { flushPending, pendingCount, refreshPending } from './lib/outbox'
import { repo } from './lib/repo'
import { isDemo } from './lib/supabase'

function openDriver() {
  if (toast.value?.driver) showDriver(toast.value.driver)
  toast.value = null
}

const online = ref(typeof navigator === 'undefined' ? true : navigator.onLine)

async function flush() {
  refreshPending()
  if (!pendingCount.value || !navigator.onLine) return
  const r = await flushPending((input) => repo.createExpense(input))
  if (r?.sent) showToast(`ส่งรายการที่ค้างไว้ ${r.sent} รายการแล้ว`)
  if (r?.dropped) showToast(`มี ${r.dropped} รายการส่งไม่ผ่าน (ข้อมูลไม่ถูกต้อง)`)
}
const onOnline = () => { online.value = true; void flush() }
const onOffline = () => { online.value = false }
const onVisible = () => { if (document.visibilityState === 'visible') void flush() }

onMounted(() => {
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)
  document.addEventListener('visibilitychange', onVisible)
  void flush()
})
onBeforeUnmount(() => {
  window.removeEventListener('online', onOnline)
  window.removeEventListener('offline', onOffline)
  document.removeEventListener('visibilitychange', onVisible)
})
</script>

<template>
  <div v-if="isDemo" class="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
    โหมดทดลอง · ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น (ยังไม่ได้ตั้งค่า Supabase)
  </div>
  <p v-if="!online || pendingCount" class="sticky top-0 z-40 bg-ink px-4 py-1.5 text-center text-xs leading-relaxed text-white">
    <CloudOff v-if="!online" class="mr-1 inline size-3.5 align-[-2px]" />
    <template v-if="!online">ออฟไลน์ · ดูแผนได้ปกติ · ค่าใช้จ่ายเป็นข้อมูลล่าสุดที่โหลดไว้</template>
    <template v-if="!online && pendingCount"> · </template>
    <template v-if="pendingCount">รอส่ง {{ pendingCount }} รายการ (ส่งเองเมื่อมีเน็ต)</template>
  </p>
  <RouterView />

  <Transition enter-from-class="opacity-0 translate-y-2" leave-to-class="opacity-0" enter-active-class="transition" leave-active-class="transition">
    <div v-if="toast" class="fixed inset-x-4 bottom-40 z-50 mx-auto flex max-w-sm items-center gap-2 rounded-xl bg-ink/90 px-4 py-2.5 text-sm text-white shadow-lg">
      <span class="min-w-0 flex-1 truncate" :class="toast.action || toast.driver ? '' : 'text-center'">{{ toast.text }}</span>
      <button v-if="toast.driver" class="flex shrink-0 items-center gap-1 rounded-lg bg-sand px-2.5 py-1.5 text-xs font-bold text-navy"
              @click="openDriver">
        <CarTaxiFront class="size-3.5" /> ให้คนขับดู
      </button>
      <a v-if="toast.action" :href="toast.action.href" target="_blank" rel="noopener noreferrer"
         class="shrink-0 rounded-lg bg-white px-2.5 py-1.5 text-xs font-bold text-navy">{{ toast.action.label }}</a>
    </div>
  </Transition>

  <DriverCard v-if="driverTarget" :target="driverTarget" />
</template>
