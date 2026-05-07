import type { Plugin as ReactPlugin } from "eslint-plugin-react"
import type { Plugin as ReactHooksPlugin } from "eslint-plugin-react-hooks"
import type { Plugin as PerfectionistPlugin } from "eslint-plugin-perfectionist"
import type { Linter } from "eslint"

const config: Linter.Config[] = [
  {
    ignores: ["**/target/**", "**/dist/**", "*.min.js", "*.log", "pnpm-debug.log*"],
  },
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      react: require("eslint-plugin-react") as ReactPlugin,
      "react-hooks": require("eslint-plugin-react-hooks") as ReactHooksPlugin,
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
]

export default config
