import { defineConfig } from "tsup"

export default defineConfig({
  entry: ["src/node.ts", "src/react.ts"],
  format: ["esm"],
  dts: false,
  clean: true,
  outDir: "dist",
  splitting: false,
  sourcemap: false,
})
