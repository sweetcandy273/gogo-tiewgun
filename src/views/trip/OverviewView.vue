<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronRight, Phone, Plane, Wallet } from 'lucide-vue-next'
import { copyText } from '../../lib/copy'
import { useTrip } from '../../lib/tripContext'

const { trip, guide, base } = useTrip()

const now = ref(Date.now())
const timer = setInterval(() => { now.value = Date.now() }, 60_000)
onBeforeUnmount(() => clearInterval(timer))

const countdown = computed(() => {
  const at = guide?.hero.departAt ?? (trip.value.start_date ? trip.value.start_date + 'T00:00:00+07:00' : null)
  if (!at) return null
  const ms = new Date(at).getTime() - now.value
  if (ms <= 0) return null
  return { d: Math.floor(ms / 86_400_000), h: Math.floor((ms % 86_400_000) / 3_600_000) }
})
</script>

<template>
  <section class="relative h-64 overflow-hidden bg-gradient-to-br from-navy to-sea sm:rounded-b-3xl">
    <img v-if="guide" :src="guide.hero.src" :alt="guide.hero.alt" class="absolute inset-0 size-full object-cover" />
    <div class="absolute inset-0 bg-gradient-to-t from-navy via-navy/40 to-transparent" />
    <div class="absolute inset-x-0 bottom-0 p-5 text-white">
      <p class="text-xs font-semibold tracking-[0.3em] opacity-80">{{ guide?.hero.kicker ?? trip.currency }}</p>
      <h1 class="text-3xl font-bold">{{ guide?.hero.title ?? trip.name }}</h1>
      <p v-if="guide" class="mt-1 text-sm opacity-90">{{ guide.hero.sub }}</p>
      <p v-if="countdown" class="mt-3 inline-block rounded-full bg-white/20 px-3 py-1 text-sm font-semibold backdrop-blur">
        อีก {{ countdown.d }} วัน {{ countdown.h }} ชม. ออกเดินทาง ✈️
      </p>
    </div>
  </section>

  <div class="space-y-6 px-4 pt-5">
    <section v-if="!guide" class="card text-center">
      <p class="text-sm text-mute">ทริปนี้ยังไม่มีแผนรายวัน — ใช้บันทึกค่าใช้จ่ายได้เลย</p>
      <RouterLink :to="`${base}/expenses`" class="btn-primary mt-3"><Wallet class="size-4" /> ไปหน้าค่าใช้จ่าย</RouterLink>
    </section>

    <template v-if="guide">
      <section>
        <h2 class="mb-2 text-lg font-bold">แผนรายวัน</h2>
        <div class="space-y-2">
          <RouterLink v-for="(d, i) in guide.days" :key="d.label" :to="`${base}/day/${i}`"
            class="card flex items-center gap-3 !p-3 transition active:scale-[.99]">
            <span class="grid size-12 shrink-0 place-items-center rounded-xl text-center text-[0.65rem] leading-tight font-bold text-white"
                  :style="{ background: d.accent }">{{ d.label.replace('DAY ', 'วัน ') }}</span>
            <span class="min-w-0 flex-1">
              <span class="block truncate font-semibold">{{ d.title }}</span>
              <span class="block truncate text-xs text-mute">{{ d.transport }}</span>
            </span>
            <ChevronRight class="size-5 shrink-0 text-mute" />
          </RouterLink>
        </div>
      </section>

      <section v-if="guide.flights.length">
        <h2 class="mb-2 flex items-center gap-2 text-lg font-bold"><Plane class="size-5 text-sea" /> {{ guide.flightsTitle ?? 'เที่ยวบิน' }}</h2>
        <div class="card divide-y divide-black/5 !p-0">
          <div v-for="f in guide.flights" :key="f.no" class="flex items-center gap-3 px-4 py-3">
            <span class="w-14 shrink-0 rounded-md bg-sand px-1.5 py-0.5 text-center text-[0.7rem] font-semibold text-navy">{{ f.leg }}</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold">{{ f.no }} · {{ f.time }}</p>
              <p class="truncate text-xs text-mute">{{ f.date }} · {{ f.route }}</p>
            </div>
          </div>
        </div>
        <p v-if="guide.bookingNote" class="mt-2 text-xs text-mute">{{ guide.bookingNote }}</p>
      </section>

      <section v-if="guide.hotels.length">
        <h2 class="mb-2 text-lg font-bold">ที่พัก</h2>
        <div class="space-y-3">
          <article v-for="h in guide.hotels" :key="h.name" class="card overflow-hidden !p-0">
            <img :src="h.photo" :alt="h.name" class="h-40 w-full object-cover" loading="lazy" />
            <div class="space-y-1.5 p-4">
              <p class="text-xs font-semibold text-brick">{{ h.city }}</p>
              <h3 class="font-bold">{{ h.name }}</h3>
              <button class="zh-chip text-left text-sm" @click="copyText(h.zh)">{{ h.zh }}</button>
              <p class="text-sm text-mute">{{ h.address }}</p>
              <p class="text-xs text-mute">{{ h.note }}</p>
              <div class="flex flex-wrap gap-2 pt-1">
                <a v-for="p in h.phones" :key="p" :href="`tel:${p.replace(/[^+\d]/g, '')}`" class="btn-ghost !py-1.5 text-xs">
                  <Phone class="size-3.5" /> {{ p }}
                </a>
              </div>
            </div>
          </article>
        </div>
        <p class="mt-2 text-xs text-mute">แตะชื่อภาษาจีนเพื่อคัดลอกไปค้นในแผนที่</p>
      </section>
    </template>
  </div>
</template>
