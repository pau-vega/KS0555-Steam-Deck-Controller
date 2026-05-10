import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

// ---------------------------------------------------------------------------
// Gap 05-01-01: node.js → node.ts ESM conversion
// Tests that packages/eslint-config/src/node.ts:
//   - Exists as .ts (not .js)
//   - Uses ESM export default (not module.exports)
//   - Uses import type for plugin types
//   - Exports a Linter.Config[] array with correct structure
// ---------------------------------------------------------------------------

const SRC_PATH = resolve(__dirname, "../src/node.ts")
const DIST_PATH = resolve(__dirname, "../dist/node.js")

// --- Content-based tests (verify source file patterns) ---

describe("packages/eslint-config/src/node.ts", () => {
  it("exists as a .ts file (not .js)", () => {
    const content = readFileSync(SRC_PATH, "utf-8")
    expect(content).toBeTruthy()
    // Verify it's the .ts file, not the old .js
    expect(SRC_PATH.endsWith(".ts")).toBe(true)
  })

  it("uses ESM export default and does not use module.exports", () => {
    const content = readFileSync(SRC_PATH, "utf-8")
    const exportDefaultMatches = content.match(/export\s+default/g)
    expect(exportDefaultMatches).not.toBeNull()
    expect(exportDefaultMatches!.length).toBeGreaterThanOrEqual(1)
    expect(content).not.toMatch(/module\.exports/)
  })

  it("uses import type for plugin types", () => {
    const content = readFileSync(SRC_PATH, "utf-8")
    const importTypeMatches = content.match(/import\s+type/g)
    expect(importTypeMatches).not.toBeNull()
    expect(importTypeMatches!.length).toBeGreaterThanOrEqual(1)
  })

  it("annotates config as Linter.Config[]", () => {
    const content = readFileSync(SRC_PATH, "utf-8")
    expect(content).toMatch(/Linter\.Config\[\]/)
  })

  it("configures perfectionist plugin for .ts files", () => {
    const content = readFileSync(SRC_PATH, "utf-8")
    expect(content).toMatch(/files:\s*\["\*\*\/\*\.ts"\]/)
    expect(content).toMatch(/perfectionist/)
  })

  it("configs *.config.ts to have project: null", () => {
    const content = readFileSync(SRC_PATH, "utf-8")
    expect(content).toMatch(/files:\s*\["\*\.config\.ts"\]/)
    expect(content).toMatch(/project:\s*null/)
  })
})

// --- Behavioral tests (import built dist output) ---

describe("dist/node.js (built output)", () => {
  it(
    "loads and exports a Linter.Config[] array with 2 items",
    async () => {
      const mod = await import(DIST_PATH)
      const config = mod.default
      expect(Array.isArray(config)).toBe(true)
      expect(config.length).toBe(2)
    },
    10_000,
  )

  it("first config targets **/*.ts with perfectionist sort-imports rule", async () => {
    const mod = await import(DIST_PATH)
    const config = mod.default
    expect(config[0].files).toEqual(["**/*.ts"])
    expect(config[0].plugins).toHaveProperty("perfectionist")
    expect(config[0].languageOptions).toHaveProperty("parser")
    expect(config[0].rules).toHaveProperty("perfectionist/sort-imports", "error")
  })

  it("second config sets project: null for *.config.ts", async () => {
    const mod = await import(DIST_PATH)
    const config = mod.default
    expect(config[1].files).toEqual(["*.config.ts"])
    expect(config[1].languageOptions.parserOptions).toHaveProperty("project", null)
  })
})
