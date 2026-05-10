import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

// ---------------------------------------------------------------------------
// Gap 05-01-02: react.js → react.ts ESM conversion
// Tests that packages/eslint-config/src/react.ts:
//   - Exists as .ts (not .js)
//   - Uses ESM export default (not module.exports)
//   - Uses import type for all 3 plugin types
//   - Has ignores block and proper config structure
// ---------------------------------------------------------------------------

const SRC_PATH = resolve(__dirname, "../src/react.ts")
const DIST_PATH = resolve(__dirname, "../dist/react.js")

// --- Content-based tests (verify source file patterns) ---

describe("packages/eslint-config/src/react.ts", () => {
  it("exists as a .ts file (not .js)", () => {
    const content = readFileSync(SRC_PATH, "utf-8")
    expect(content).toBeTruthy()
    expect(SRC_PATH.endsWith(".ts")).toBe(true)
  })

  it("uses ESM export default and does not use module.exports", () => {
    const content = readFileSync(SRC_PATH, "utf-8")
    const exportDefaultMatches = content.match(/export\s+default/g)
    expect(exportDefaultMatches).not.toBeNull()
    expect(exportDefaultMatches!.length).toBeGreaterThanOrEqual(1)
    expect(content).not.toMatch(/module\.exports/)
  })

  it("uses import type for all 3 plugin types + Linter", () => {
    const content = readFileSync(SRC_PATH, "utf-8")
    const importTypeMatches = content.match(/import\s+type/g)
    expect(importTypeMatches).not.toBeNull()
    expect(importTypeMatches!.length).toBeGreaterThanOrEqual(3)
  })

  it("annotates config as Linter.Config[]", () => {
    const content = readFileSync(SRC_PATH, "utf-8")
    expect(content).toMatch(/Linter\.Config\[\]/)
  })

  it("includes ignores block for built assets", () => {
    const content = readFileSync(SRC_PATH, "utf-8")
    expect(content).toMatch(/ignores/)
    expect(content).toMatch(/target/)
    expect(content).toMatch(/dist/)
  })

  it("configures react, react-hooks, and perfectionist plugins", () => {
    const content = readFileSync(SRC_PATH, "utf-8")
    expect(content).toMatch(/react/)
    expect(content).toMatch(/react-hooks/)
    expect(content).toMatch(/perfectionist/)
  })

  it("targets .ts and .tsx files", () => {
    const content = readFileSync(SRC_PATH, "utf-8")
    expect(content).toMatch(/\*\*\/\*\.ts/)
    expect(content).toMatch(/\*\*\/\*\.tsx/)
  })
})

// --- Behavioral tests (import built dist output) ---

describe("dist/react.js (built output)", () => {
  it(
    "loads and exports a Linter.Config[] array with 2 items (ignores + rules)",
    async () => {
      const mod = await import(DIST_PATH)
      const config = mod.default
      expect(Array.isArray(config)).toBe(true)
      expect(config.length).toBe(2)
    },
    10_000,
  )

  it("first config is an ignores block for build artifacts", async () => {
    const mod = await import(DIST_PATH)
    const config = mod.default
    expect(config[0]).toHaveProperty("ignores")
    expect(config[0].ignores).toContain("**/target/**")
    expect(config[0].ignores).toContain("**/dist/**")
  })

  it("second config targets **/*.ts and **/*.tsx with all 3 plugins", async () => {
    const mod = await import(DIST_PATH)
    const config = mod.default
    expect(config[1].files).toEqual(["**/*.ts", "**/*.tsx"])
    expect(config[1].plugins).toHaveProperty("react")
    expect(config[1].plugins).toHaveProperty("react-hooks")
    expect(config[1].plugins).toHaveProperty("perfectionist")
    expect(config[1].rules).toHaveProperty("perfectionist/sort-imports", "error")
  })
})
