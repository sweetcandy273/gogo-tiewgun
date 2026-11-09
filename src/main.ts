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
