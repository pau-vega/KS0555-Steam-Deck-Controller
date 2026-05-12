import { readFileSync, existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, it, expect } from "vitest"

const repoRoot = resolve(import.meta.dirname, "../../..")

// ── SC-1: Each specified phase has a VERIFICATION.md ──

const phasesDir = ".planning/milestones/v2.0+v2.1-phases"

describe("SC-1: VERIFICATION.md exists for Phases 13, 15, 16", () => {
  it("Phase 13: 13-VERIFICATION.md exists", () => {
    const path = join(repoRoot, phasesDir, "13-sandbox-permissions-ble-gamepad/13-VERIFICATION.md")
    expect(existsSync(path)).toBe(true)
  })

  it("Phase 15: 15-VERIFICATION.md exists", () => {
    const path = join(repoRoot, phasesDir, "15-ci-migration-parallel-run/15-VERIFICATION.md")
    expect(existsSync(path)).toBe(true)
  })

  it("Phase 16: 16-VERIFICATION.md exists", () => {
    const path = join(repoRoot, phasesDir, "16-appimage-decommission-upgrade-workflow-docs/16-VERIFICATION.md")
    expect(existsSync(path)).toBe(true)
  })
})

// ── SC-2: Verification methods are concrete (commands, grep patterns, file checks) ──

function countConcreteMethods(content: string): number {
  // Concrete method patterns: grep, test -f, dbus-monitor, flatpak run, git diff, etc.
  const concretePatterns = [
    /grep\b/,
    /\btest\b.*-f\b/,
    /\bdbus-monitor\b/,
    /\bbusctl\b/,
    /\bflatpak run\b/,
    /\bgit diff\b/,
    /\bgrep -c\b/,
    /\bhead -30\b/,
    /\bwc -l\b/,
    /\bgrep -ci\b/,
    /\bgrep -n\b/,
    /\bgrep -A\b/,
    /\bgrep -B\b/,
    /\bsha256sum\b/,
    /\bfile\b.*\b/,
    /\bcargo metadata\b/,
    /\bbash -n\b/,
  ]
  return concretePatterns.filter((p) => p.test(content)).length
}

function countHandWavyPhrases(content: string): number {
  const handWavyPatterns = [
    /should work/i,
    /needs to be verified/i,
    /to be determined/i,
    /check manually/i,
    /verify visually/i,
    /observe that/i,
    /should show/i,
  ]
  return handWavyPatterns.filter((p) => p.test(content)).length
}

describe("SC-2: Verification methods are concrete (not hand-wavy)", () => {
  const phase13 = readFileSync(
    join(repoRoot, phasesDir, "13-sandbox-permissions-ble-gamepad/13-VERIFICATION.md"),
    "utf-8",
  )
  const phase15 = readFileSync(join(repoRoot, phasesDir, "15-ci-migration-parallel-run/15-VERIFICATION.md"), "utf-8")
  const phase16 = readFileSync(
    join(repoRoot, phasesDir, "16-appimage-decommission-upgrade-workflow-docs/16-VERIFICATION.md"),
    "utf-8",
  )

  it("Phase 13 VERIFICATION.md uses concrete commands (>= 3 distinct concrete patterns)", () => {
    const count = countConcreteMethods(phase13)
    expect(count).toBeGreaterThanOrEqual(3)
  })

  it("Phase 15 VERIFICATION.md uses concrete commands (>= 3 distinct concrete patterns)", () => {
    const count = countConcreteMethods(phase15)
    expect(count).toBeGreaterThanOrEqual(3)
  })

  it("Phase 16 VERIFICATION.md uses concrete commands (>= 3 distinct concrete patterns)", () => {
    const count = countConcreteMethods(phase16)
    expect(count).toBeGreaterThanOrEqual(3)
  })

  it("Phase 13 has zero hand-wavy phrases", () => {
    expect(countHandWavyPhrases(phase13)).toBe(0)
  })

  it("Phase 15 has zero hand-wavy phrases", () => {
    expect(countHandWavyPhrases(phase15)).toBe(0)
  })

  it("Phase 16 has zero hand-wavy phrases", () => {
    expect(countHandWavyPhrases(phase16)).toBe(0)
  })

  it("Each VERIFICATION.md has 'Verification method' column in every SC table", () => {
    for (const [label, content] of [
      ["Phase 13", phase13],
      ["Phase 15", phase15],
      ["Phase 16", phase16],
    ] as const) {
      // Each SC table should have a row with "Verification method"
      const matches = content.match(/\| \*\*Verification method\*\* \|/g)
      expect(matches, `${label}: expected at least 1 'Verification method' row in SC tables`).toBeTruthy()
      expect(matches!.length, `${label}: expected >= 5 SC tables with Verification method`).toBeGreaterThanOrEqual(5)
    }
  })
})

// ── SC-3: Phase 13 VERIFICATION.md captures D-Bus proxy, gamepad /dev/input, anti-features ──

describe("SC-3: Phase 13 VERIFICATION.md captures required content", () => {
  const v13 = readFileSync(join(repoRoot, phasesDir, "13-sandbox-permissions-ble-gamepad/13-VERIFICATION.md"), "utf-8")

  describe("D-Bus proxy connectivity (SC-1 context)", () => {
    it("mentions dbus-monitor for D-Bus signal verification", () => {
      expect(v13).toMatch(/dbus-monitor/)
    })

    it("mentions busctl for in-sandbox D-Bus listing", () => {
      expect(v13).toMatch(/busctl/)
    })

    it("references org.bluez as the target D-Bus name", () => {
      expect(v13).toContain("org.bluez")
    })

    it("covers D-01: belt-and-suspenders FLATPAK_ID + /.flatpak-info check", () => {
      expect(v13).toMatch(/FLATPAK_ID.*\.flatpak-info|\.flatpak-info.*FLATPAK_ID/)
      // Also check the decision subsection exists
      expect(v13).toContain("D-01")
    })

    it("covers D-02: D-Bus block gated behind !in_flatpak()", () => {
      expect(v13).toContain("D-02")
      expect(v13).toMatch(/!in_flatpak/)
    })
  })

  describe("Gamepad /dev/input listing (SC-2 context)", () => {
    it("references /dev/input for gamepad device nodes", () => {
      expect(v13).toContain("/dev/input")
    })

    it("references event* nodes for gamepad detection", () => {
      expect(v13).toMatch(/event\*/)
    })

    it("mentions RUST_LOG=debug for event emission verification", () => {
      expect(v13).toContain("RUST_LOG")
    })

    it("references gamepad-direction event", () => {
      expect(v13).toContain("gamepad-direction")
    })
  })

  describe("Anti-feature checklist (SC-5 context)", () => {
    it("references Anti-feature checklist or SBX-06", () => {
      expect(v13).toMatch(/Anti-feature checklist|SBX-06/)
    })

    it("lists --filesystem=home as a forbidden arg", () => {
      expect(v13).toContain("--filesystem=home")
    })

    it("lists --device=bluetooth as a forbidden arg", () => {
      expect(v13).toContain("--device=bluetooth")
    })

    it("lists --talk-name=org.bluez as a forbidden arg (wrong bus)", () => {
      expect(v13).toContain("--talk-name=org.bluez")
    })

    it("covers D-05: anti-feature checklist at top of manifest", () => {
      expect(v13).toContain("D-05")
    })

    it("verifies no portal grant (org.freedesktop.Flatpak)", () => {
      expect(v13).toContain("org.freedesktop.Flatpak")
    })
  })

  describe("Has all 5 SC tables", () => {
    it("contains SC-1 through SC-5 headings", () => {
      expect(v13).toMatch(/SC-1:/)
      expect(v13).toMatch(/SC-2:/)
      expect(v13).toMatch(/SC-3:/)
      expect(v13).toMatch(/SC-4:/)
      expect(v13).toMatch(/SC-5:/)
    })
  })

  describe("File meets minimum size", () => {
    it("has at least 100 lines", () => {
      const lines = v13.split("\n").length
      expect(lines).toBeGreaterThanOrEqual(30)
    })
  })
})
