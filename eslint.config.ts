import jsonPlugin from "@eslint/json"
import { defineConfig } from "eslint/config"

export default defineConfig([
  {
    ignores: [
      "**/node_modules/",
      "**/dist/",
      "**/.turbo/",
      "**/.vite/",
      "**/target/",
      "**/coverage/",
      "**/build/",
      "**/test-results/",
      "**/playwright-report/",
      "**/blob-report/",
      "**/src-tauri/gen/",
      "*.min.js",
      "*.log",
      "*.tsbuildinfo",
      "pnpm-lock.yaml",
      "pnpm-debug.log*",
    ],
  },
  {
    files: ["*.json"],
    ignores: ["package-lock.json"],
    plugins: { json: jsonPlugin },
    language: "json/json",
    extends: ["json/recommended"],
  },
])
