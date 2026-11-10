<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { RouterLink } from 'vue-router'
import { ChevronLeft, ChevronRight, MapPin } from 'lucide-vue-next'
import PageHeader from '../../components/PageHeader.vue'
import { amapSearchUrl, amapCity } from '../../lib/amap'
import { copyPlace, onZhClick } from '../../lib/copy'
import { useTrip } from '../../lib/tripContext'
import { withReadings } from '../../lib/zhReadings'

const props = defineProps<{ n: string }>()
const { guide, base } = useTrip()
const days = guide?.days ?? []
const idx = computed(() => {
  const i = Number.parseInt(props.n, 10)
  return Number.isInteger(i) && i >= 0 && i < days.length ? i : 0
})
const day = computed(() => days[idx.value])
watchEffect(() => { amapCity.value = day.value?.city ?? guide?.amapCity ?? '' })
</script>

<template>
  <p v-if="!day" class="py-16 text-center text-sm text-mute">ทริปนี้ยังไม่มีแผนรายวัน</p>
  <div v-else @click="onZhClick">
    <PageHeader :kicker="day.label" :title="day.title" :sub="day.transport" :accent="day.accent" />
    <div class="px-4">
      <p class="mb-3 text-xs text-mute">แตะคำภาษาจีน (พื้นสีฟ้า) = คัดลอก + ปุ่ม "เปิดใน Amap"</p>

      <ol class="relative space-y-3 border-l-2 pl-5" :style="{ borderColor: day.accent + '55' }">
        <li v-for="(it, i) in day.items" :key="i" class="relative">
          <span class="absolute top-4 -left-[1.72rem] size-3 rounded-full ring-4 ring-cream"
                :class="it.minor ? 'border-2 bg-white' : ''"
                :style="it.minor ? { borderColor: day.accent } : { background: day.accent }" />
          <div class="card !p-3.5">
            <p class="text-xs font-bold" :style="{ color: day.accent }">{{ it.time }}</p>
            <!-- title/body are bundled trip-book HTML (sanitized at build), never user input -->
            <h3 class="rich mt-0.5 leading-snug font-semibold">
              <span v-html="withReadings(it.title)" />
              <span v-for="t in it.tags" :key="t.text" :class="['tag', `tag-${t.kind}`]">{{ t.text }}</span>
            </h3>
            <div v-if="it.body" class="rich mt-1.5 text-sm leading-relaxed text-ink/85" v-html="withReadings(it.body)" />
          </div>
        </li>
      </ol>

      <div v-if="day.photos.length" class="mt-5 grid gap-3" :class="day.photos.length > 1 ? 'grid-cols-2' : ''">
        <figure v-for="p in day.photos" :key="p.src" class="overflow-hidden rounded-2xl bg-white shadow-sm">
          <img :src="p.src" :alt="p.caption" class="aspect-[4/3] w-full object-cover" loading="lazy" />
          <figcaption class="px-3 py-2 text-[0.7rem] text-mute">{{ p.caption }}</figcaption>
        </figure>
      </div>

      <div v-if="day.cards.length" class="mt-5 space-y-3">
        <section v-for="c in day.cards" :key="c.title" class="card">
          <div class="mb-1.5 flex items-start justify-between gap-2">
            <h3 class="font-bold text-navy">{{ c.title }}</h3>
            <a v-if="c.zh.length === 1" :href="amapSearchUrl(c.zh[0])" target="_blank" rel="noopener noreferrer" class="btn-ghost !px-2 !py-1 text-xs" @click.stop="copyPlace(c.zh[0])">
              <MapPin class="size-3.5" /> Amap
            </a>
          </div>
          <div class="rich text-sm leading-relaxed text-ink/85" v-html="withReadings(c.body)" />
        </section>
      </div>

      <nav class="mt-6 flex gap-3">
        <RouterLink v-if="idx > 0" :to="`${base}/day/${idx - 1}`" class="btn-ghost flex-1">
          <ChevronLeft class="size-4" /> {{ days[idx - 1].label }}
        </RouterLink>
        <RouterLink v-if="idx < days.length - 1" :to="`${base}/day/${idx + 1}`" class="btn-primary flex-1">
          {{ days[idx + 1].label }} <ChevronRight class="size-4" />
        </RouterLink>
      </nav>
    </div>
  </div>
</template>
