<script setup lang="ts">
defineProps<{ kicker?: string; title: string; sub?: string; accent?: string }>()
</script>

<template>
  <header class="px-4 pt-6 pb-3">
    <p v-if="kicker" class="mb-1 inline-block rounded-md px-2 py-0.5 text-[0.7rem] font-bold tracking-widest text-white"
       :style="{ background: accent ?? 'var(--color-navy)' }">{{ kicker }}</p>
    <h1 class="text-2xl leading-tight font-bold text-ink">{{ title }}</h1>
    <p v-if="sub" class="mt-1 text-sm text-mute">{{ sub }}</p>
    <slot />
  </header>
</template>
