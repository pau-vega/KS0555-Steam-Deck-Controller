import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': '/src'
    }
  },
  // Tauri integration settings (per D-21)
  clearScreen: false, // Preserve Rust errors in terminal
  server: {
    strictPort: true, // Tauri expects fixed port 5173
    port: 5173, // Must match devUrl in tauri.conf.json
    watch: {
      ignored: ['**/src-tauri/**'] // Don't reload on Rust changes
    }
  }
})
