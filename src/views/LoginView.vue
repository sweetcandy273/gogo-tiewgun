<script setup lang="ts">
import { ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import PageHeader from '../components/PageHeader.vue'
import { signIn } from '../lib/auth'

const email = ref('')
const password = ref('')
const busy = ref(false)
const err = ref<string | null>(null)
const route = useRoute()
const router = useRouter()

async function submit() {
  if (busy.value) return
  busy.value = true
  err.value = null
  try {
    await signIn(email.value, password.value)
    const next = typeof route.query.next === 'string' && route.query.next.startsWith('/') && !route.query.next.startsWith('//')
      ? route.query.next : '/'
    await router.replace(next)
  } catch {
    err.value = 'อีเมลหรือรหัสผ่านไม่ถูกต้อง'
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <PageHeader title="เข้าสู่ระบบ" sub="gogo เที่ยวกัน · สำหรับอุ้มและทิว" />
  <form class="card mx-4 space-y-3" @submit.prevent="submit">
    <div>
      <label class="label" for="email">อีเมล</label>
      <input id="email" v-model="email" class="field" type="email" autocomplete="username" required />
    </div>
    <div>
      <label class="label" for="pw">รหัสผ่าน</label>
      <input id="pw" v-model="password" class="field" type="password" autocomplete="current-password" required />
    </div>
    <p v-if="err" class="text-sm text-brick">{{ err }}</p>
    <button class="btn-primary w-full" :disabled="busy">{{ busy ? 'กำลังเข้า…' : 'เข้าสู่ระบบ' }}</button>
  </form>
</template>
