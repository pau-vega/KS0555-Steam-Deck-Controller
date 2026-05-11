import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

// ---------------------------------------------------------------------------
// Gap 05-03-02: Build validation — dist/ output exists and is valid ESM
// Tests that:
//   - dist/node.js and dist/react.js exist
//   - dist output contains valid ESM export default
//   - dist output can be imported as a module
//   - Build output structure matches source
// ---------------------------------------------------------------------------

const DIST_NODE = resolve(__dirname, "../dist/node.js")
const DIST_REACT = resolve(__dirname, "../dist/react.js")

describe("dist/ output files exist", () => {
  it("dist/node.js exists", () => {
    expect(existsSync(DIST_NODE)).toBe(true)
  })

  it("dist/react.js exists", () => {
    expect(existsSync(DIST_REACT)).toBe(true)
  })
})

describe("dist/node.js content verification", () => {
  it("contains export default (valid ESM)", () => {
    const content = readFileSync(DIST_NODE, "utf-8")
    expect(content).toMatch(/export\s+\{/)
    expect(content).toMatch(/as\s+default/)
  })

  it("contains both config entries (node.ts + config.ts)", () => {
    const content = readFileSync(DIST_NODE, "utf-8")
    expect(content).toMatch(/\*\*\/\*\.ts/)
    expect(content).toMatch(/\*\.config\.ts/)
  })
})

describe("dist/react.js content verification", () => {
  it("contains export default (valid ESM)", () => {
    const content = readFileSync(DIST_REACT, "utf-8")
    expect(content).toMatch(/export\s+\{/)
    expect(content).toMatch(/as\s+default/)
  })

  it("contains ignores block and plugin configs", () => {
    const content = readFileSync(DIST_REACT, "utf-8")
    expect(content).toMatch(/ignores/)
    expect(content).toMatch(/react/)
    expect(content).toMatch(/react-hooks/)
    expect(content).toMatch(/perfectionist/)
  })
})

// Behavioral: can import and get correct structure
describe("dist/node.js import behavior", () => {
  it("imports and exports a valid Linter.Config[]", async () => {
    const mod = await import(DIST_NODE)
    expect(mod).toHaveProperty("default")
    const config = mod.default
    expect(Array.isArray(config)).toBe(true)
    expect(config.length).toBeGreaterThanOrEqual(1)
    expect(config[0]).toHaveProperty("files")
    expect(config[0]).toHaveProperty("rules")
  }, 10_000)
})

describe("dist/react.js import behavior", () => {
  it("imports and exports a valid Linter.Config[]", async () => {
    const mod = await import(DIST_REACT)
    expect(mod).toHaveProperty("default")
    const config = mod.default
    expect(Array.isArray(config)).toBe(true)
    expect(config.length).toBeGreaterThanOrEqual(1)
    expect(config[0]).toHaveProperty("ignores")
  }, 10_000)
})
