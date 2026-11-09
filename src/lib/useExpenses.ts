import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { errMessage, repo } from './repo'
import { settle } from './settle'
import type { Expense, ExpenseInput, Trip } from './types'

export function useExpenses(trip: Ref<Trip>) {
  const items = ref<Expense[]>([])
  const loading = ref(true)
  const error = ref<string | null>(null)
  let unsubscribe: (() => void) | null = null
  let seq = 0

  async function load(): Promise<void> {
    const my = ++seq // drop out-of-order responses
    try {
      const [list, t] = await Promise.all([repo.listExpenses(trip.value.id), repo.getTrip(trip.value.slug)])
      if (my !== seq) return
      items.value = list
      if (t) trip.value = t // picks up a rate changed on the other phone
      error.value = null
    } catch (e) {
      if (my === seq) error.value = errMessage(e)
    } finally {
      if (my === seq) loading.value = false
    }
  }

  async function run<T>(fn: () => Promise<T>): Promise<T | undefined> {
    try {
      const out = await fn()
      await load()
      return out
    } catch (e) {
      error.value = errMessage(e)
      return undefined
    }
  }

  const create = (input: Omit<ExpenseInput, 'trip_id'>) => run(() => repo.createExpense({ ...input, trip_id: trip.value.id }))
  const update = (id: string, input: Omit<ExpenseInput, 'trip_id'>) => run(() => repo.updateExpense(id, { ...input, trip_id: trip.value.id }))
  const remove = (id: string) => run(() => repo.removeExpense(id))
  const setRate = (r: number) => run(() => repo.updateTrip(trip.value.id, { rate_to_thb: r }))

  const summary = computed(() => settle(items.value, trip.value.rate_to_thb))
  const onVisible = () => { if (document.visibilityState === 'visible') void load() }

  onMounted(() => {
    void load()
    unsubscribe = repo.subscribe(() => { void load() })
    document.addEventListener('visibilitychange', onVisible)
  })
  onBeforeUnmount(() => {
    unsubscribe?.()
    document.removeEventListener('visibilitychange', onVisible)
  })

  return { items, loading, error, summary, load, create, update, remove, setRate }
}
