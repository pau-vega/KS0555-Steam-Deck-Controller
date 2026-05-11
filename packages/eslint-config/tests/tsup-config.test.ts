import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

// ---------------------------------------------------------------------------
// Gap 05-02-01: tsup.config.ts build configuration
// Tests that packages/eslint-config/tsup.config.ts:
//   - Uses ESM format
//   - Has entry points for node.ts and react.ts
//   - Has dts: false (deviation from plan: dts generation failed for Plugins)
//   - Outputs to dist/ directory
// ---------------------------------------------------------------------------

// Note: We read the file as text instead of importing it because importing
// would require tsup to be resolved and the module to be loadable at runtime.
// Content verification is the reliable approach for build config files.

const CONFIG_PATH = resolve(__dirname, "../tsup.config.ts")

describe("packages/eslint-config/tsup.config.ts", () => {
  it("exists and is readable", () => {
    const content = readFileSync(CONFIG_PATH, "utf-8")
    expect(content).toBeTruthy()
  })

  it("exports a tsup config via defineConfig", () => {
    const content = readFileSync(CONFIG_PATH, "utf-8")
    expect(content).toMatch(/defineConfig/)
    expect(content).toMatch(/export\s+default/)
  })

  it("has entry points for both node.ts and react.ts", () => {
    const content = readFileSync(CONFIG_PATH, "utf-8")
    expect(content).toMatch(/src\/node\.ts/)
    expect(content).toMatch(/src\/react\.ts/)
  })

  it("outputs ESM format (not CJS)", () => {
    const content = readFileSync(CONFIG_PATH, "utf-8")
    expect(content).toMatch(/format.*esm/)
    expect(content).not.toMatch(/format.*cjs/)
  })

  it("has dts generation disabled (dts: false)", () => {
    const content = readFileSync(CONFIG_PATH, "utf-8")
    // The actual implementation uses dts: false due to type resolution issues
    // with eslint-plugin-perfectionist not exporting Plugin type
    expect(content).toMatch(/dts:\s*false/)
  })

  it("outputs to dist/ directory with clean enabled", () => {
    const content = readFileSync(CONFIG_PATH, "utf-8")
    expect(content).toMatch(/outDir.*dist/)
    expect(content).toMatch(/clean.*true/)
  })
})
