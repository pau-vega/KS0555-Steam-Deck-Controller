import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, it, expect } from "vitest"

const repoRoot = resolve(import.meta.dirname, "../../..")
const buildYmlPath = join(repoRoot, ".github/workflows/build.yml")
const buildYml = readFileSync(buildYmlPath, "utf-8")

describe("CI workflow: .github/workflows/build.yml", () => {
  it("CI-01: uses flatpak-builder CLI with Freedesktop 24.08 runtime", () => {
    expect(buildYml).toContain("flatpak-builder")
    expect(buildYml).toMatch(/freedesktop/i)
  })

  it("CI-01: flatpak-builder references manifest yaml", () => {
    expect(buildYml).toContain("flatpak/com.ks0555.robotcontroller.yaml")
  })

  it("CI-02: uses action-gh-release@v2 for release upload", () => {
    expect(buildYml).toContain("softprops/action-gh-release@v2")
  })

  it("CI-02: release uploads .flatpak file as release asset", () => {
    expect(buildYml).toMatch(/RobotController-\${{.*env\.VERSION.*}}-x86_64\.flatpak/)
  })

  it("CI-02: SHA256 checksum generated before release upload", () => {
    expect(buildYml).toContain("sha256sum")
  })

  it("CI-03: no arm64 or aarch64 references in build.yml", () => {
    expect(buildYml).not.toMatch(/arm64|aarch64/i)
  })

  it("CI-04: Freedesktop runtime installed via flatpak install", () => {
    expect(buildYml).toContain("flatpak install")
    expect(buildYml).toMatch(/freedesktop.*24\.08/)
  })

  it("has per-job permissions for release upload", () => {
    expect(buildYml).toContain("contents: write")
    expect(buildYml).toMatch(/permissions:\s*\n\s+contents:\s+write/)
  })

  it("has pnpm store caching", () => {
    expect(buildYml).toContain("pnpm-store")
  })

  it("has Cargo registry and target caching", () => {
    const cacheMatches = buildYml.match(/actions\/cache@v4/g)
    expect(cacheMatches).toBeTruthy()
    expect(cacheMatches!.length).toBeGreaterThanOrEqual(2)
    expect(buildYml).toContain("~/.cargo/registry")
    expect(buildYml).toContain("cargo-target")
  })

  it("has skip_release workflow_dispatch input", () => {
    expect(buildYml).toContain("skip_release")
  })

  it("is valid YAML syntax", () => {
    expect(buildYml).toMatch(/^name:/m)
    expect(buildYml).toMatch(/^on:/m)
    expect(buildYml).toMatch(/^jobs:/m)
  })

  // ── Phase 16: AppImage Decommission + CI Consolidation ──

  it("CI-05: build-x64 job removed (grep returns 0)", () => {
    const matches = buildYml.match(/build-x64/g)
    expect(matches).toBeNull()
  })

  it("CI-05: build-flatpak-x64 renamed to build (no build-flatpak-x64)", () => {
    const matches = buildYml.match(/build-flatpak-x64/g)
    expect(matches).toBeNull()
  })

  it("CI-05: single job named 'build' exists", () => {
    expect(buildYml).toMatch(/^  build:/m)
  })

  it("CI-05: no concurrency block (cancel-in-progress removed)", () => {
    expect(buildYml).not.toContain("concurrency")
  })

  it("CI-05: no cancel-in-progress", () => {
    expect(buildYml).not.toContain("cancel-in-progress")
  })

  it("D-09: no AppImage references in build.yml", () => {
    expect(buildYml).not.toMatch(/[Aa]pp[Ii]mage/)
  })

  it("D-02: VAL-08 git diff --exit-code dropped from CI", () => {
    expect(buildYml).not.toContain("git diff --exit-code")
  })

  it("D-04: version extracted from Cargo.toml (grep)", () => {
    expect(buildYml).toContain("grep '^version'")
    expect(buildYml).not.toMatch(/GITHUB_REF_NAME#v/)
  })

  it("PKG-03: upload-artifact steps for deb and flatpak (Phase 19)", () => {
    const uploadCount = (buildYml.match(/upload-artifact/g) || []).length
    expect(uploadCount).toBe(2)
    expect(buildYml).not.toContain("download-artifact")
  })

  it("D-11: top-level permissions are contents: read", () => {
    const lines = buildYml.split("\n")
    const permIdx = lines.findIndex((l) => l.trim() === "permissions:")
    const nextLine = lines[permIdx + 1]
    expect(nextLine).toBeDefined()
    expect(nextLine!.trim()).toBe("contents: read")
  })
})
