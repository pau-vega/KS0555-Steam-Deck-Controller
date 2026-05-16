import { describe, expect, it } from "vitest"

import { DEFAULT_PWM, encodeCommand } from "./encode-command"

describe("encodeCommand", () => {
  it("encodes F to F150 newline", () => {
    expect(encodeCommand("F")).toBe("F150\n")
  })

  it("encodes B to B150 newline", () => {
    expect(encodeCommand("B")).toBe("B150\n")
  })

  it("encodes L to L150 newline", () => {
    expect(encodeCommand("L")).toBe("L150\n")
  })

  it("encodes R to R150 newline", () => {
    expect(encodeCommand("R")).toBe("R150\n")
  })

  it("encodes S to S newline", () => {
    expect(encodeCommand("S")).toBe("S\n")
  })

  it("emits the trailing newline as a single 0x0A byte", () => {
    const out = encodeCommand("F")
    expect(out.charCodeAt(out.length - 1)).toBe(10)
  })

  it("emits the Stop payload as exactly two bytes", () => {
    expect(encodeCommand("S").length).toBe(2)
  })

  it("every directional output starts with the requested direction letter", () => {
    for (const d of ["F", "B", "L", "R"] as const) {
      expect(encodeCommand(d).startsWith(d)).toBe(true)
    }
  })

  it("every directional output ends with newline", () => {
    for (const d of ["F", "B", "L", "R"] as const) {
      expect(encodeCommand(d).endsWith("\n")).toBe(true)
    }
  })

  it("every directional output satisfies the BLE wire regex", () => {
    for (const d of ["F", "B", "L", "R"] as const) {
      expect(/^[FBLR]\d{2,3}\n$/.test(encodeCommand(d))).toBe(true)
    }
  })

  it("Stop payload satisfies the BLE Stop regex", () => {
    expect(/^S\n$/.test(encodeCommand("S"))).toBe(true)
  })

  it("DEFAULT_PWM is within the validator accept range", () => {
    expect(DEFAULT_PWM >= 80 && DEFAULT_PWM <= 255).toBe(true)
  })
})
