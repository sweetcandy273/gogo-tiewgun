import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { serviceWorker } from './sw/plugin'

export default defineConfig({
  plugins: [vue(), tailwindcss(), serviceWorker()],
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'sw/**/*.test.ts'],
  },
})
