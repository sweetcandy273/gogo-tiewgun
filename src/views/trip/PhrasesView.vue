<script setup lang="ts">
import { Volume2 } from 'lucide-vue-next'
import PageHeader from '../../components/PageHeader.vue'
import { copyText } from '../../lib/copy'
import { canSpeak, speakZh } from '../../lib/speak'
import { useTrip } from '../../lib/tripContext'

const { guide } = useTrip()
const tts = canSpeak()
</script>

<template>
  <PageHeader kicker="WORDS" title="คำง่าย ๆ ที่ต้องใช้" :sub="tts ? 'แตะ 🔊 เพื่อฟังเสียง · แตะการ์ดเพื่อคัดลอก' : 'แตะการ์ดเพื่อคัดลอก หรือยื่นมือถือให้คนขายอ่าน'" accent="#B5533C" />
  <div v-if="guide" class="space-y-5 px-4">
    <section v-for="s in guide.phrases" :key="s.section">
      <h2 class="mb-2 font-bold text-brick">{{ s.section }}</h2>
      <div class="grid gap-2 sm:grid-cols-2">
        <div v-for="p in s.items" :key="p.zh" class="card flex items-start gap-2 !p-0">
          <button class="min-w-0 flex-1 p-3 text-left active:opacity-70" @click="copyText(p.zh)">
            <p class="text-xs font-semibold text-brick">{{ p.meaning }}</p>
            <p class="mt-0.5 text-xl font-bold text-navy">{{ p.zh }}</p>
            <p class="text-xs text-mute">{{ p.pinyin }}</p>
            <p class="text-sm font-semibold">{{ p.read }}</p>
          </button>
          <button v-if="tts" class="m-2 grid size-11 shrink-0 place-items-center rounded-full bg-sea/10 text-sea active:bg-sea active:text-white"
                  :aria-label="`ฟังเสียง ${p.meaning}`" @click="speakZh(p.zh)">
            <Volume2 class="size-5" />
          </button>
        </div>
      </div>
    </section>

    <section v-if="guide.drinks?.length">
      <h2 class="mb-2 font-bold text-brick">เครื่องดื่ม / ชานม</h2>
      <div class="grid grid-cols-3 gap-2">
        <button v-for="[th, zh, py] in guide.drinks" :key="zh" class="card relative !p-2.5 text-center" @click="tts ? speakZh(zh) : copyText(zh)">
          <Volume2 v-if="tts" class="absolute top-1.5 right-1.5 size-3.5 text-sea" />
          <p class="text-[0.7rem] font-semibold text-brick">{{ th }}</p>
          <p class="text-lg font-bold text-navy">{{ zh }}</p>
          <p class="text-[0.65rem] text-mute">{{ py }}</p>
        </button>
      </div>
      <p v-if="tts" class="mt-2 text-xs text-mute">ช่องเครื่องดื่ม: แตะเพื่อฟังเสียง</p>
    </section>
  </div>
</template>
