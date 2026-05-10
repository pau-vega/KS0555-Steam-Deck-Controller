import { execSync } from "node:child_process"
import { readFileSync, existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, it, expect } from "vitest"

const repoRoot = resolve(import.meta.dirname, "../../..")

describe("Phase 16: upgrade-robot-controller.sh (DECK-05, D-16, D-17, D-18)", () => {
  const scriptPath = join(repoRoot, "upgrade-robot-controller.sh")

  it("D-16: script exists at repo root", () => {
    expect(existsSync(scriptPath)).toBe(true)
  })

  it("D-16: script is executable", () => {
    try {
      execSync("test -x " + scriptPath, { encoding: "utf-8" })
    } catch {
      expect.fail("upgrade-robot-controller.sh is not executable")
    }
  })

  it("is valid Bash syntax", () => {
    expect(() => execSync("bash -n " + scriptPath, { encoding: "utf-8" })).not.toThrow()
  })

  const script = readFileSync(scriptPath, "utf-8")

  it("has strict error handling (set -euo pipefail)", () => {
    expect(script).toContain("set -euo pipefail")
  })

  it("D-18: has --check flag", () => {
    expect(script).toContain("--check")
  })

  it("D-18: has --force flag", () => {
    expect(script).toContain("--force")
  })

  it("has --help flag", () => {
    expect(script).toContain("--help")
  })

  it("has --version flag", () => {
    expect(script).toContain("--version")
  })

  it("D-16: uses curl (GitHub Releases API)", () => {
    expect(script).toContain("curl")
  })

  it("D-16: uses jq (JSON parsing)", () => {
    expect(script).toContain("jq")
  })

  it("D-19: polls GitHub Releases API", () => {
    expect(script).toContain("api.github.com")
  })

  it("D-18: uses flatpak install --user --reinstall", () => {
    expect(script).toContain("flatpak install --user --reinstall")
  })

  it("D-18: verifies checksum via sha256sum", () => {
    expect(script).toContain("sha256sum")
  })

  it("uses /tmp/robot-controller-upgrade temp directory", () => {
    expect(script).toContain("/tmp/robot-controller-upgrade")
  })

  it("has com.ks0555.robotcontroller app ID", () => {
    expect(script).toContain("com.ks0555.robotcontroller")
  })

  it("D-19: matches RobotController asset pattern", () => {
    expect(script).toMatch(/RobotController.*x86_64\.flatpak/)
  })

  it("has cleanup via trap", () => {
    expect(script).toContain("trap")
  })

  it("has at least 100 lines", () => {
    const lines = script.split("\n").length
    expect(lines).toBeGreaterThanOrEqual(100)
  })

  it("D-17: has fresh install path (flatpak info check or equivalent)", () => {
    expect(script).toMatch(/flatpak info|flatpak.*install.*--user/)
  })
})

describe("Phase 16: justfile flatpak group (DOCS-04, D-23 through D-27)", () => {
  const justfile = readFileSync(join(repoRoot, "justfile"), "utf-8")

  it("D-23: has [group('flatpak')]", () => {
    const matches = justfile.match(/\[group\('flatpak'\)\]/g)
    expect(matches).toBeTruthy()
    expect(matches!.length).toBeGreaterThanOrEqual(1)
  })

  it("D-24: has flatpak-build recipe", () => {
    expect(justfile).toContain("flatpak-build")
  })

  it("D-25: has flatpak-install recipe", () => {
    expect(justfile).toContain("flatpak-install")
  })

  it("D-26: has flatpak-run recipe", () => {
    expect(justfile).toContain("flatpak-run")
  })

  it("D-27: has flatpak-deploy recipe", () => {
    expect(justfile).toContain("flatpak-deploy")
  })

  it("D-24: flatpak-build uses direct flatpak-builder (not build.sh wrapper)", () => {
    expect(justfile).toContain("flatpak-builder --user --install --force-clean")
    expect(justfile).not.toContain("flatpak/build.sh")
  })

  it("D-25: flatpak-install uses flatpak install --user --reinstall", () => {
    expect(justfile).toContain("flatpak install --user --reinstall")
  })

  it("D-26: flatpak-run uses flatpak run com.ks0555.robotcontroller", () => {
    expect(justfile).toContain("flatpak run com.ks0555.robotcontroller")
  })

  it("D-27: flatpak-deploy uses scp (transfer only)", () => {
    expect(justfile).toContain("scp")
  })

  it("has build-bundle command for flatpak-builder output", () => {
    expect(justfile).toContain("flatpak build-bundle")
  })

  it("has build-export step in flatpak-build recipe", () => {
    expect(justfile).toContain("flatpak build-export")
  })

  it("cleans up build artifacts after flatpak-build", () => {
    expect(justfile).toContain("rm -rf build-dir repo")
  })

  it("preserves top-level shell config", () => {
    expect(justfile).toContain('set shell := ["bash"')
  })
})
