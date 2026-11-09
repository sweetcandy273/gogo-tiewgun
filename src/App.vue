<script setup lang="ts">
import { RouterView } from 'vue-router'
import { toast } from './lib/copy'
import { isDemo } from './lib/supabase'
</script>

<template>
  <div v-if="isDemo" class="bg-amber-100 px-4 py-1.5 text-center text-xs text-amber-900">
    โหมดทดลอง · ข้อมูลเก็บในเบราว์เซอร์นี้เท่านั้น (ยังไม่ได้ตั้งค่า Supabase)
  </div>
  <RouterView />

  <Transition enter-from-class="opacity-0 translate-y-2" leave-to-class="opacity-0" enter-active-class="transition" leave-active-class="transition">
    <div v-if="toast" class="fixed inset-x-4 bottom-24 z-50 mx-auto max-w-sm rounded-xl bg-ink/90 px-4 py-2.5 text-center text-sm text-white shadow-lg">
      {{ toast }}
    </div>
  </Transition>
</template>
