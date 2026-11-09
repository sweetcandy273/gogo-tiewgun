<script setup lang="ts">
import PageHeader from '../../components/PageHeader.vue'
import { copyText } from '../../lib/copy'
import { useTrip } from '../../lib/tripContext'

const { guide } = useTrip()
</script>

<template>
  <PageHeader kicker="WORDS" title="คำง่าย ๆ ที่ต้องใช้" sub="แตะการ์ดเพื่อคัดลอก หรือยื่นมือถือให้คนขายอ่าน" accent="#B5533C" />
  <div v-if="guide" class="space-y-5 px-4">
    <section v-for="s in guide.phrases" :key="s.section">
      <h2 class="mb-2 font-bold text-brick">{{ s.section }}</h2>
      <div class="grid gap-2 sm:grid-cols-2">
        <button v-for="p in s.items" :key="p.zh" class="card !p-3 text-left active:scale-[.99]" @click="copyText(p.zh)">
          <p class="text-xs font-semibold text-brick">{{ p.meaning }}</p>
          <p class="mt-0.5 text-xl font-bold text-navy">{{ p.zh }}</p>
          <p class="text-xs text-mute">{{ p.pinyin }}</p>
          <p class="text-sm font-semibold">{{ p.read }}</p>
        </button>
      </div>
    </section>

    <section v-if="guide.drinks?.length">
      <h2 class="mb-2 font-bold text-brick">เครื่องดื่ม / ชานม</h2>
      <div class="grid grid-cols-3 gap-2">
        <button v-for="[th, zh, py] in guide.drinks" :key="zh" class="card !p-2.5 text-center" @click="copyText(zh)">
          <p class="text-[0.7rem] font-semibold text-brick">{{ th }}</p>
          <p class="text-lg font-bold text-navy">{{ zh }}</p>
          <p class="text-[0.65rem] text-mute">{{ py }}</p>
        </button>
      </div>
    </section>
  </div>
</template>
