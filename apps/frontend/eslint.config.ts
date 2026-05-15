import { react } from "@ks0555/eslint-config"
import { defineConfig } from "eslint/config"

export default defineConfig([
  ...react,
  {
    languageOptions: {
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
])
