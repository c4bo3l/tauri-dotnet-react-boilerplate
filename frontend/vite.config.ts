import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  build: {
    sourcemap: false,
  },
  server: {
    port: 5173,
    strictPort: true,
    watch: {
      ignored: ['**/tauri/**'],
    },
  },
})
