<script setup lang="ts">
import { computed } from 'vue'
import { copyPlace } from '../lib/copy'
import { readingOf } from '../lib/zhReadings'

/** Plain text where every Chinese run becomes a tap-to-copy chip. */
const props = defineProps<{ text: string }>()
// skip the reading when the surrounding text already says it (e.g. "ชิงเต่า 青岛")
const th = (t: string) => { const r = readingOf(t); return r && !props.text.includes(r) ? r : '' }
const RUN = /[㐀-鿿豈-﫿](?:[㐀-鿿豈-﫿0-9（）()·？?！!，、-]*[㐀-鿿豈-﫿]|[㐀-鿿豈-﫿0-9（）()？?！!]*)/g
const parts = computed(() => {
  const out: { zh: boolean; t: string }[] = []
  let last = 0
  for (const m of props.text.matchAll(RUN)) {
    const i = m.index ?? 0
    if (i > last) out.push({ zh: false, t: props.text.slice(last, i) })
    out.push({ zh: true, t: m[0] })
    last = i + m[0].length
  }
  if (last < props.text.length) out.push({ zh: false, t: props.text.slice(last) })
  return out
})
</script>

<template>
  <span><template v-for="(p, i) in parts" :key="i"><template v-if="p.zh"><span class="zh-chip" role="button" @click.stop.prevent="copyPlace(p.t)">{{ p.t }}</span><span v-if="th(p.t)" class="zh-th">{{ th(p.t) }}</span></template><template v-else>{{ p.t }}</template></template></span>
</template>
