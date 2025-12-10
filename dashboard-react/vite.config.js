import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/web-push-service/',
  build: {
    outDir: 'dist',
  },
})
