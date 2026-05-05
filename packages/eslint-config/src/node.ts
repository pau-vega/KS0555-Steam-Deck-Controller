import type { Plugin as PerfectionistPlugin } from "eslint-plugin-perfectionist"
import type { Linter } from "eslint"

const config: Linter.Config[] = [
  {
    files: ["**/*.ts"],
    plugins: {
      perfectionist: require("eslint-plugin-perfectionist") as PerfectionistPlugin,
    },
    languageOptions: {
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: process.cwd(),
      },
    },
    rules: {
      "perfectionist/sort-imports": "error",
    },
  },
  {
    files: ["*.config.ts"],
    languageOptions: {
      parserOptions: {
        project: null,
      },
    },
  },
]

export default config
