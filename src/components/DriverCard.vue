<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue'
import { Copy, MapPin, Volume2, X } from 'lucide-vue-next'
import { amapSearchUrl } from '../lib/amap'
import { copyText } from '../lib/copy'
import { hideDriver, type DriverTarget } from '../lib/driver'
import { canSpeak, speakZh } from '../lib/speak'

const props = defineProps<{ target: DriverTarget }>()
const ASK = '师傅，请带我去这里。谢谢！'

// keep the screen on while the driver reads it (unsupported browsers just skip this)
let lock: { release(): Promise<void> } | null = null
async function keepAwake() {
  try {
    const wl = (navigator as Navigator & { wakeLock?: { request(t: 'screen'): Promise<{ release(): Promise<void> }> } }).wakeLock
    if (wl && document.visibilityState === 'visible') lock = await wl.request('screen')
  } catch { lock = null }
}
const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') hideDriver() }
const onVisible = () => { if (document.visibilityState === 'visible' && !lock) void keepAwake() }

onMounted(() => {
  void keepAwake()
  document.addEventListener('keydown', onKey)
  document.addEventListener('visibilitychange', onVisible)
})
onBeforeUnmount(() => {
  void lock?.release().catch(() => {})
  lock = null
  document.removeEventListener('keydown', onKey)
  document.removeEventListener('visibilitychange', onVisible)
})
</script>

<template>
  <div class="fixed inset-0 z-[60] flex flex-col bg-white" role="dialog" aria-modal="true" aria-label="แสดงให้คนขับดู"
       style="padding: env(safe-area-inset-top) 0 env(safe-area-inset-bottom)">
    <div class="flex items-center justify-between px-4 py-2 text-sm text-mute">
      <span>ยื่นหน้าจอนี้ให้คนขับ / พนักงานดู</span>
      <button class="rounded-full p-2 hover:bg-black/5" aria-label="ปิด" @click="hideDriver"><X class="size-6" /></button>
    </div>

    <div class="flex flex-1 flex-col justify-center gap-6 overflow-y-auto px-6 pb-6">
      <p class="text-2xl font-semibold text-navy" lang="zh-CN">{{ ASK }}</p>
      <p class="text-5xl leading-tight font-bold break-words text-ink sm:text-6xl" lang="zh-CN">{{ props.target.zh }}</p>
      <p v-if="props.target.sub" class="text-2xl leading-snug break-words text-ink/80" lang="zh-CN">{{ props.target.sub }}</p>
    </div>

    <div class="grid grid-cols-3 gap-2 border-t border-black/5 p-3">
      <button class="btn-ghost !py-3" @click="copyText(props.target.zh)"><Copy class="size-4" /> คัดลอก</button>
      <a class="btn-ghost !py-3" :href="amapSearchUrl(props.target.zh, props.target.city)" target="_blank" rel="noopener noreferrer"><MapPin class="size-4" /> Amap</a>
      <button class="btn-ghost !py-3" :disabled="!canSpeak()" @click="speakZh(`${ASK} ${props.target.zh}`)"><Volume2 class="size-4" /> ฟังเสียง</button>
    </div>
  </div>
</template>
