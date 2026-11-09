<script setup lang="ts">
import { ref, watch } from 'vue'
import { Phone } from 'lucide-vue-next'
import PageHeader from '../../components/PageHeader.vue'
import { useTrip } from '../../lib/tripContext'

const { trip, guide } = useTrip()

// checklist ticks are personal → kept per device, per trip
const KEY = `gogo-checklist-${trip.value.slug}`
function load(): Record<string, boolean> {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(KEY) ?? '{}')
    return v && typeof v === 'object' ? (v as Record<string, boolean>) : {}
  } catch {
    return {}
  }
}
const done = ref<Record<string, boolean>>(load())
watch(done, (v) => { try { localStorage.setItem(KEY, JSON.stringify(v)) } catch { /* ignore */ } }, { deep: true })
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

    <section v-if="guide.checklist.length" class="card">
      <h2 class="mb-2 font-bold">เช็กลิสต์ก่อนไป</h2>
      <label v-for="c in guide.checklist" :key="c" class="flex items-start gap-3 py-1.5">
        <input v-model="done[c]" type="checkbox" class="mt-0.5 size-5 accent-[#1b4965]" />
        <span class="text-sm" :class="done[c] ? 'text-mute line-through' : ''">{{ c }}</span>
      </label>
      <p class="mt-2 text-xs text-mute">ติ๊กเก็บไว้ในมือถือเครื่องนี้</p>
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
