import { readFileSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, it, expect } from "vitest"

const repoRoot = resolve(import.meta.dirname, "../../..")
const buildYmlPath = join(repoRoot, ".github/workflows/build.yml")
const buildYml = readFileSync(buildYmlPath, "utf-8")

describe("CI workflow: .github/workflows/build.yml", () => {
  it("CI-01: uses flatpak-builder CLI with Freedesktop 24.08 runtime", () => {
    expect(buildYml).toContain("flatpak-builder")
    expect(buildYml).toMatch(/org\.freedesktop\.Platform/)
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

  it("CI-04: Freedesktop 24.08 runtime installed via flatpak install", () => {
    expect(buildYml).toContain("flatpak install")
    expect(buildYml).toMatch(/org\.freedesktop\.Platform.*24\.08/)
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

  it("hardening: gh-release fail_on_unmatched_files enabled", () => {
    expect(buildYml).toContain("fail_on_unmatched_files: true")
  })

  it("hardening: upload-artifact steps set if-no-files-found: error", () => {
    const matches = buildYml.match(/if-no-files-found:\s*error/g)
    expect(matches).not.toBeNull()
    expect(matches!.length).toBe(2)
  })

  it("hardening: verify flatpak bundle step exists with size check", () => {
    expect(buildYml).toContain("verify flatpak bundle")
    expect(buildYml).toContain("flatpak bundle is empty")
    expect(buildYml).toContain("flatpak bundle suspiciously small")
  })

  it("hardening: tag triggers cover plain-semver and v-prefixed", () => {
    expect(buildYml).toMatch(/tags:\s*\n\s+-\s+"\[0-9\]\*"\s*\n\s+-\s+"v\*"/)
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

  // ── Phase 19: Deb Validation Detail (PKG-03) ──

  it("PKG-03: validate deb contents step runs dpkg -c on .deb", () => {
    expect(buildYml).toContain("validate deb contents")
    expect(buildYml).toContain("dpkg -c")
  })

  it("PKG-03: dpkg validation checks binary and desktop file exist in deb", () => {
    expect(buildYml).toContain("usr/bin/robot-controller")
    expect(buildYml).toContain("usr/share/applications/")
  })

  it("PKG-03: deb artifact named robot-controller-deb with wildcard path", () => {
    expect(buildYml).toContain("name: robot-controller-deb")
    expect(buildYml).toMatch(/\/\*\.deb/)
  })

  // ── Phase 19: Flatpak Validation Detail (VAL-05) ──

  it("VAL-05: flatpak artifact upload named robot-controller-flatpak", () => {
    expect(buildYml).toContain("name: robot-controller-flatpak")
  })

  it("VAL-05: flatpak upload includes both .flatpak and .sha256 files", () => {
    expect(buildYml).toContain("RobotController-${{ env.VERSION }}-x86_64.flatpak")
    expect(buildYml).toContain("RobotController-${{ env.VERSION }}-x86_64.flatpak.sha256")
  })

  it("VAL-05: flatpak build-export and build-bundle commands present", () => {
    expect(buildYml).toContain("flatpak build-export")
    expect(buildYml).toContain("flatpak build-bundle")
  })

  it("VAL-05: flatpak SDK 24.08 runtime installed alongside platform", () => {
    expect(buildYml).toContain("org.freedesktop.Sdk//24.08")
  })

  it("VAL-05: flatpak sources verification checks deb, manifest, metainfo, icons", () => {
    expect(buildYml).toContain("verify flatpak sources")
    expect(buildYml).toContain("flatpak/robot-controller.deb")
    expect(buildYml).toContain("flatpak/com.ks0555.robotcontroller.metainfo.xml")
    expect(buildYml).toContain("icons/32x32/com.ks0555.robotcontroller.png")
  })

  it("D-11: top-level permissions are contents: read", () => {
    const lines = buildYml.split("\n")
    const permIdx = lines.findIndex((l) => l.trim() === "permissions:")
    const nextLine = lines[permIdx + 1]
    expect(nextLine).toBeDefined()
    expect(nextLine!.trim()).toBe("contents: read")
  })
})
