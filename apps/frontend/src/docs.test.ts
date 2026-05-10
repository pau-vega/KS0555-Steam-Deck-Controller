import { readFileSync, existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, it, expect } from "vitest"

const repoRoot = resolve(import.meta.dirname, "../../..")

describe("Phase 16: README.md (DOCS-01, D-22)", () => {
  const readme = readFileSync(join(repoRoot, "README.md"), "utf-8")

  it("D-09: no AppImage references in README.md", () => {
    expect(readme).not.toMatch(/[Aa]pp[Ii]mage/)
  })

  it("D-08: no install-on-steamdeck.sh references in README.md", () => {
    expect(readme).not.toContain("install-on-steamdeck.sh")
  })

  it("has flatpak install --user in install section", () => {
    expect(readme).toMatch(/flatpak install --user/)
  })

  it("references upgrade-robot-controller.sh", () => {
    expect(readme).toContain("upgrade-robot-controller.sh")
  })

  it("has Non-Steam Game setup instructions", () => {
    expect(readme).toMatch(/Non-Steam Game|Add a Non-Steam Game/)
  })

  it("mentions Gaming Mode or gaming mode", () => {
    expect(readme).toMatch(/[Gg]aming [Mm]ode/)
  })

  it("references com.ks0555.robotcontroller app ID", () => {
    expect(readme).toContain("com.ks0555.robotcontroller")
  })

  it("references .flatpak bundle file", () => {
    expect(readme).toContain("RobotController-x86_64.flatpak")
  })
})

describe("Phase 16: docs/RUNNING.md (D-08)", () => {
  const runningMd = readFileSync(join(repoRoot, "docs/RUNNING.md"), "utf-8")

  it("D-09: no AppImage references in docs/RUNNING.md", () => {
    expect(runningMd).not.toMatch(/[Aa]pp[Ii]mage/)
  })

  it("D-08: no install-on-steamdeck.sh references", () => {
    expect(runningMd).not.toContain("install-on-steamdeck.sh")
  })

  it("has flatpak install --user instructions", () => {
    expect(runningMd).toMatch(/flatpak install --user/)
  })

  it("references upgrade-robot-controller.sh", () => {
    expect(runningMd).toContain("upgrade-robot-controller.sh")
  })

  it("references flatpak run com.ks0555.robotcontroller", () => {
    expect(runningMd).toContain("com.ks0555.robotcontroller")
  })
})

describe("Phase 16: ARCHITECTURE.md (DOCS-02, D-20)", () => {
  const archPath = join(repoRoot, "apps/frontend/src-tauri/ARCHITECTURE.md")

  it("ARCHITECTURE.md exists", () => {
    expect(existsSync(archPath)).toBe(true)
  })

  const archMd = readFileSync(archPath, "utf-8")

  it("has at least 80 lines", () => {
    const lines = archMd.split("\n").length
    expect(lines).toBeGreaterThanOrEqual(80)
  })

  it("documents in_flatpak() detection (D-Bus gate)", () => {
    const matches = archMd.match(/in_flatpak/g)
    expect(matches).toBeTruthy()
    expect(matches!.length).toBeGreaterThanOrEqual(2)
  })

  it("documents deb-extract build chain", () => {
    expect(archMd).toMatch(/deb.extract|deb extract/i)
  })

  it("documents finish-args (sandbox model)", () => {
    expect(archMd).toContain("finish-args")
  })

  it("documents belt-and-suspenders pattern", () => {
    expect(archMd).toContain("belt-and-suspenders")
  })

  it("documents BLE sandbox args (system-talk-name=org.bluez)", () => {
    expect(archMd).toContain("system-talk-name=org.bluez")
  })

  it("documents gamepad sandbox args (device=input)", () => {
    expect(archMd).toContain("device=input")
  })

  it("includes anti-feature checklist", () => {
    expect(archMd).toMatch(/[Aa]nti-[Ff]eature [Cc]hecklist/)
  })

  it("cross-references flatpak/README.md", () => {
    expect(archMd).toMatch(/flatpak\/README\.md/)
  })

  it("cross-references lib.rs", () => {
    expect(archMd).toContain("lib.rs")
  })
})

describe("Phase 16: flatpak/README.md (DOCS-03, D-21)", () => {
  const fpReadme = readFileSync(join(repoRoot, "flatpak/README.md"), "utf-8")

  it("documents finish-args (at least 3 occurrences)", () => {
    const matches = fpReadme.match(/finish-args/g)
    expect(matches).toBeTruthy()
    expect(matches!.length).toBeGreaterThanOrEqual(3)
  })

  it("documents BLE sandbox args (system-talk-name=org.bluez)", () => {
    expect(fpReadme).toContain("system-talk-name=org.bluez")
  })

  it("documents gamepad sandbox args (device=input)", () => {
    expect(fpReadme).toContain("device=input")
  })

  it("includes anti-feature checklist", () => {
    expect(fpReadme).toMatch(/[Aa]nti-[Ff]eature [Cc]hecklist/)
  })

  it("explains D-Bus Gate (in_flatpak)", () => {
    expect(fpReadme).toMatch(/D-Bus Gate|in_flatpak/)
  })

  it("documents belt-and-suspenders pattern", () => {
    expect(fpReadme).toContain("belt-and-suspenders")
  })

  it("explains principle of least privilege", () => {
    expect(fpReadme).toMatch(/principle of least privilege/i)
  })

  it("cross-references ARCHITECTURE.md", () => {
    expect(fpReadme).toMatch(/ARCHITECTURE\.md/)
  })

  it("D-21: no stale 'added in a later phase' notes", () => {
    expect(fpReadme).not.toMatch(/added in a later phase/i)
  })

  it("notes Flatpak 1.15.6 requirement for --device=input", () => {
    expect(fpReadme).toMatch(/Flatpak 1\.15\.6|1\.15\.6/)
  })

  it("shows in_flatpak detection code with FLATPAK_ID", () => {
    expect(fpReadme).toContain("FLATPAK_ID")
  })

  it("covers DECK-05 in checklist coverage", () => {
    expect(fpReadme).toContain("DECK-05")
  })

  it("documents deb-extract pattern", () => {
    expect(fpReadme).toMatch(/deb.extract|deb extract/i)
  })
})

describe("Phase 16: install-on-steamdeck.sh deleted (D-08)", () => {
  it("install-on-steamdeck.sh does not exist at repo root", () => {
    expect(existsSync(join(repoRoot, "install-on-steamdeck.sh"))).toBe(false)
  })
})
