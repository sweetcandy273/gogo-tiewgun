import { createRouter, createWebHistory } from 'vue-router'
import { initAuth, session } from './lib/auth'
import { isDemo } from './lib/supabase'

export const router = createRouter({
  history: createWebHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: '/', name: 'trips', component: () => import('./views/TripsView.vue') },
    { path: '/login', name: 'login', component: () => import('./views/LoginView.vue'), meta: { public: true } },
    {
      path: '/t/:slug',
      component: () => import('./views/trip/TripLayout.vue'),
      props: true,
      children: [
        { path: '', name: 'trip', component: () => import('./views/trip/OverviewView.vue') },
        { path: 'day/:n', name: 'day', component: () => import('./views/trip/DayView.vue'), props: true },
        { path: 'expenses', name: 'expenses', component: () => import('./views/trip/ExpensesView.vue') },
        { path: 'phrases', name: 'phrases', component: () => import('./views/trip/PhrasesView.vue') },
        { path: 'info', name: 'info', component: () => import('./views/trip/InfoView.vue') },
      ],
    },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
})

router.beforeEach(async (to) => {
  if (to.meta.public || isDemo) return true
  await initAuth()
  if (!session.value) return { name: 'login', query: { next: to.fullPath } }
  return true
})
