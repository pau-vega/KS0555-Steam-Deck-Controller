import { describe, it, expect, beforeAll } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"

// ---------------------------------------------------------------------------
// Gap 05-02-02: package.json ESM + types configuration
// Tests that packages/eslint-config/package.json:
//   - Has "type": "module" for ESM
//   - Has "main" pointing to "dist/node.js"
//   - Has "types" pointing to "dist/node.d.ts"
//   - Has "files": ["dist/"]
//   - Has build script using tsup
// ---------------------------------------------------------------------------

const PKG_PATH = resolve(__dirname, "../package.json")

describe("packages/eslint-config/package.json", () => {
  let pkg: Record<string, unknown>

  beforeAll(() => {
    pkg = JSON.parse(readFileSync(PKG_PATH, "utf-8"))
  })

  it('has "type": "module" for ESM support', () => {
    expect(pkg["type"]).toBe("module")
  })

  it('has "main" pointing to "dist/node.js"', () => {
    expect(pkg["main"]).toBe("dist/node.js")
  })

  it('has "types" pointing to "dist/node.d.ts"', () => {
    expect(pkg["types"]).toBe("dist/node.d.ts")
  })

  it('has "files" containing only "dist/"', () => {
    expect(pkg["files"]).toEqual(["dist/"])
  })

  it('has build script "tsup"', () => {
    const scripts = pkg["scripts"] as Record<string, string>
    expect(scripts?.["build"]).toBe("tsup")
  })

  it("has tsup as a devDependency", () => {
    const devDeps = pkg["devDependencies"] as Record<string, string>
    expect(devDeps).toHaveProperty("tsup")
  })
})
