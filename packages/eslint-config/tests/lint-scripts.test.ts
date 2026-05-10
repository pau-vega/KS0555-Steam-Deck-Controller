import { describe, it, expect } from "vitest"
import { readFileSync, existsSync } from "fs"
import { resolve } from "path"

// ---------------------------------------------------------------------------
// Gap 05-03-01: Lint scripts in consuming apps reference .ts config files
// Tests that:
//   - apps/frontend/package.json lint script points to src/react.ts
//   - apps/backend would point to src/node.ts if backend exists
// ---------------------------------------------------------------------------

const FRONTEND_PKG = resolve(__dirname, "../../../apps/frontend/package.json")
const BACKEND_PKG = resolve(__dirname, "../../../apps/backend/package.json")

describe("apps/frontend/package.json lint script", () => {
  it("lint script references react.ts (not react.js)", () => {
    const pkg = JSON.parse(readFileSync(FRONTEND_PKG, "utf-8"))
    const lintScript: string = pkg.scripts?.lint ?? ""
    expect(lintScript).toMatch(/react\.ts/)
    expect(lintScript).not.toMatch(/react\.js/)
  })
})

describe("apps/backend/package.json lint script", () => {
  it("backend app does not exist yet (no package.json) — no lint script to verify", () => {
    // apps/backend is a planned app; it only has .turbo/ directory
    expect(existsSync(BACKEND_PKG)).toBe(false)
  })
})
