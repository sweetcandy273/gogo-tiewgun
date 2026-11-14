<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { Copy, Lock, LockOpen, Pencil, Plus } from 'lucide-vue-next'
import BookingForm from '../../components/BookingForm.vue'
import PageHeader from '../../components/PageHeader.vue'
import { copyText, showToast } from '../../lib/copy'
import { me } from '../../lib/me'
import { isNetworkError } from '../../lib/outbox'
import { errMessage } from '../../lib/repo'
import { useTrip } from '../../lib/tripContext'
import { BOOKING_KINDS, type Booking, type BookingInput } from '../../lib/types'
import { CODE_RE, clearVault, failureMessage, formatDate, formatWait, groupByKind, readCache, readToken, writeCache, writeToken } from '../../lib/vault'
import { vaultApi, VaultAuthError } from '../../lib/vaultRepo'

const { trip } = useTrip()
const slug = trip.value.slug
// localStorage can throw (private mode, blocked) → treat as "nothing stored"
const kv = {
  getItem: (k: string) => { try { return localStorage.getItem(k) } catch { return null } },
  setItem: (k: string, v: string) => localStorage.setItem(k, v),
  removeItem: (k: string) => localStorage.removeItem(k),
}

const token = ref<string | null>(readToken(kv, slug)?.token ?? null)
const items = ref<Booking[]>([])
const loading = ref(false)
const staleAt = ref<number | null>(null) // set when showing the offline copy
const code = ref('')
const unlocking = ref(false)
const message = ref<string | null>(null)
const editing = ref<Booking | 'new' | null>(null)
const saving = ref(false)
const confirmRevoke = ref(false)

const groups = computed(() => groupByKind(items.value))
const codeOk = computed(() => CODE_RE.test(code.value))

function forget(msg: string | null) {
  clearVault(kv, slug)
  token.value = null
  items.value = []
  staleAt.value = null
  editing.value = null
  message.value = msg
}

/** run a vault call with the stored token; a rejected token sends the device back to the code screen */
async function authed<T>(fn: (t: string) => Promise<T>): Promise<T | undefined> {
  if (!token.value) return undefined
  try {
    return await fn(token.value)
  } catch (e) {
    if (e instanceof VaultAuthError) { forget('หมดอายุ ใส่รหัสอีกครั้ง'); return undefined }
    throw e
  }
}

async function load() {
  loading.value = true
  try {
    const rows = await authed((t) => vaultApi.list(t))
    if (!rows) return
    items.value = rows
    staleAt.value = null
    writeCache(kv, slug, rows)
    message.value = null
  } catch (e) {
    const cached = readCache(kv, slug)
    if (isNetworkError(e, navigator.onLine) && cached) {
      items.value = cached.items
      staleAt.value = cached.savedAt
    } else {
      message.value = `โหลดไม่ได้: ${errMessage(e)}`
    }
  } finally {
    loading.value = false
  }
}

async function unlock() {
  if (!codeOk.value || unlocking.value) return
  unlocking.value = true
  message.value = null
  try {
    const r = await vaultApi.unlock(slug, code.value, me.value || 'device')
    if (!r.ok) { message.value = failureMessage(r); code.value = ''; return }
    if (!writeToken(kv, slug, { token: r.token, expires_at: r.expires_at })) {
      showToast('จำเครื่องไม่ได้ ต้องใส่รหัสทุกครั้ง')
    }
    token.value = r.token
    code.value = ''
    await load()
  } catch (e) {
    message.value = isNetworkError(e, navigator.onLine) ? 'ไม่มีเน็ต ต้องต่อเน็ตตอนปลดล็อก' : errMessage(e)
  } finally {
    unlocking.value = false
  }
}

async function save(input: BookingInput) {
  if (saving.value) return
  saving.value = true
  try {
    const row = await authed((t) => vaultApi.save(t, input))
    if (!row) return
    const i = items.value.findIndex((b) => b.id === row.id)
    if (i >= 0) items.value[i] = row
    else items.value.push(row)
    writeCache(kv, slug, items.value)
    editing.value = null
    showToast('บันทึกแล้ว')
  } catch (e) {
    showToast(`บันทึกไม่ได้: ${errMessage(e)}`)
  } finally {
    saving.value = false
  }
}

async function removeEditing() {
  if (saving.value || !editing.value || editing.value === 'new') return
  const id = editing.value.id
  saving.value = true
  try {
    const done = await authed(async (t) => { await vaultApi.remove(t, id); return true })
    if (!done) return
    items.value = items.value.filter((b) => b.id !== id)
    writeCache(kv, slug, items.value)
    editing.value = null
  } catch (e) {
    showToast(`ลบไม่ได้: ${errMessage(e)}`)
  } finally {
    saving.value = false
  }
}

async function lockDevice() {
  const t = token.value
  forget(null)
  if (t) await vaultApi.lock(t).catch(() => { /* best effort: the local token is already gone */ })
}

async function revokeAll() {
  confirmRevoke.value = false
  try {
    const done = await authed(async (t) => { await vaultApi.revokeAll(t); return true })
    if (done) forget('ออกทุกเครื่องแล้ว')
  } catch (e) {
    showToast(`ทำไม่ได้: ${errMessage(e)}`)
  }
}

const staleText = computed(() => {
  if (staleAt.value == null) return ''
  const mins = Math.max(0, Math.round((Date.now() - staleAt.value) / 60_000))
  return mins < 1 ? 'เมื่อสักครู่' : `${formatWait(mins * 60)}ก่อน`
})

onMounted(() => { if (token.value) void load() })
</script>

<template>
  <PageHeader kicker="BOOKINGS" title="การจอง" sub="เลขจอง ตั๋ว ที่พัก" />

  <!-- locked -->
  <form v-if="!token" class="mx-4 card space-y-3" @submit.prevent="unlock">
    <div class="flex items-center gap-2 font-bold"><Lock class="size-5 text-navy" /> ใส่รหัส 6 หลัก</div>
    <input v-model="code" class="field text-center !text-2xl tracking-[0.3em]" type="password" inputmode="numeric" pattern="[0-9]*"
           maxlength="6" autocomplete="off" placeholder="••••••" aria-label="รหัส" />
    <p v-if="message" class="text-sm text-brick" role="alert">{{ message }}</p>
    <button class="btn-primary w-full !py-3 text-base" :disabled="!codeOk || unlocking">{{ unlocking ? 'กำลังตรวจ…' : 'ปลดล็อก' }}</button>
    <p class="text-center text-xs text-mute">เครื่องนี้จะจำไว้ 1 ปี</p>
  </form>

  <!-- unlocked -->
  <div v-else class="space-y-4 px-4">
    <p v-if="staleAt != null" class="rounded-xl bg-sand px-3 py-2 text-xs text-ink/80">
      ออฟไลน์ · ข้อมูลเมื่อ {{ staleText }} · แก้ไม่ได้
    </p>
    <p v-if="message" class="rounded-xl bg-rose-100 px-3 py-2 text-sm text-rose-800" role="alert">{{ message }}</p>

    <button class="btn-primary w-full" :disabled="staleAt != null" @click="editing = 'new'"><Plus class="size-5" /> เพิ่ม</button>

    <p v-if="loading && !items.length" class="py-8 text-center text-sm text-mute">กำลังโหลด…</p>
    <p v-else-if="!items.length && !message" class="py-8 text-center text-sm text-mute">ยังไม่มีข้อมูล</p>

    <section v-for="g in groups" :key="g.kind">
      <h2 class="mb-1.5 text-sm font-bold text-navy">{{ BOOKING_KINDS[g.kind].icon }} {{ BOOKING_KINDS[g.kind].label }}</h2>
      <div class="space-y-2">
        <article v-for="b in g.items" :key="b.id" class="card">
          <div class="flex items-start justify-between gap-2">
            <div class="min-w-0">
              <h3 class="font-semibold break-words">{{ b.title }}</h3>
              <p v-if="b.on_date" class="text-xs text-mute">{{ formatDate(b.on_date) }}</p>
            </div>
            <button v-if="staleAt == null" class="shrink-0 rounded-full p-1.5 text-mute hover:bg-black/5" :aria-label="`แก้ไข ${b.title}`" @click="editing = b"><Pencil class="size-4" /></button>
          </div>
          <button v-if="b.ref" type="button" class="mt-2 flex w-full items-center justify-between gap-2 rounded-xl bg-sand px-3 py-2 text-left active:scale-[0.99]"
                  :aria-label="`คัดลอกเลขจอง ${b.ref}`" @click="copyText(b.ref)">
            <span class="font-mono text-base font-bold break-all">{{ b.ref }}</span>
            <Copy class="size-4 shrink-0 text-navy" />
          </button>
          <p v-if="b.details" class="mt-2 text-sm whitespace-pre-line text-ink/90">{{ b.details }}</p>
        </article>
      </div>
    </section>

    <div class="space-y-2 pt-2">
      <button class="btn-ghost w-full" @click="lockDevice"><LockOpen class="size-4" /> ล็อกเครื่องนี้</button>
      <button v-if="!confirmRevoke" class="w-full text-center text-xs text-mute underline" @click="confirmRevoke = true">ออกทุกเครื่อง (มือถือหาย)</button>
      <div v-else class="flex gap-2">
        <button class="btn-ghost flex-1" @click="confirmRevoke = false">ยกเลิก</button>
        <button class="btn-danger flex-1" @click="revokeAll">ออกทุกเครื่อง</button>
      </div>
    </div>
  </div>

  <BookingForm v-if="editing" :booking="editing === 'new' ? null : editing" :saving="saving" @save="save" @remove="removeEditing" @close="editing = null" />
</template>
