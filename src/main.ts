import { createApp } from 'vue'
import App from './App.vue'
import { router } from './router'
import '@fontsource/ibm-plex-sans-thai/thai-400.css'
import '@fontsource/ibm-plex-sans-thai/thai-600.css'
import '@fontsource/ibm-plex-sans-thai/latin-400.css'
import '@fontsource/ibm-plex-sans-thai/latin-600.css'
import '@fontsource/ibm-plex-sans-thai/thai-700.css'
import '@fontsource/ibm-plex-sans-thai/latin-700.css'
import './style.css'

createApp(App).use(router).mount('#app')

// offline support: precached app + last-loaded trip data (see sw/sw.template.js)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  const hadController = !!navigator.serviceWorker.controller
  let reloaded = false
  // a new version took over → reload once so lazy chunks match the new build
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController || reloaded) return
    reloaded = true
    window.location.reload()
  })
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => { /* offline support is best-effort */ })
  })
}
