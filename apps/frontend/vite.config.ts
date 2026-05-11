import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": "/src",
    },
  },
  // Tauri integration settings (per D-21)
  clearScreen: false, // Preserve Rust errors in terminal
  server: {
    strictPort: true, // Tauri expects fixed port 5173
    port: 5173, // Must match devUrl in tauri.conf.json
    watch: {
      ignored: ["**/src-tauri/**"], // Don't reload on Rust changes
    },
  },
  build: {
    // WebKitGTK on Linux (incl. SteamOS) needs older JS target.
    // Without this, modern JS features cause a blank white screen.
    target: process.env.TAURI_ENV_PLATFORM === "windows" ? "chrome105" : "safari15",
    minify: process.env.TAURI_ENV_DEBUG ? false : "esbuild",
    sourcemap: !!process.env.TAURI_ENV_DEBUG,
  },
})
