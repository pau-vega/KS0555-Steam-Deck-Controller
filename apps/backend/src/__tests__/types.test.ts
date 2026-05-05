import { describe, it, expect } from "vitest"

import type { ValidCommand } from "../types.js"

import { isValidCommand, VALID_COMMANDS } from "../types.js"

describe("Command Validation", () => {
  it("should validate valid commands", () => {
    const validCommands: ValidCommand[] = ["F", "B", "L", "R", "S"]

    validCommands.forEach((cmd) => {
      expect(isValidCommand(cmd)).toBe(true)
    })
  })

  it("should reject invalid commands", () => {
    const invalidCommands = ["X", "f", "123", "", "FB", "stop"]

    invalidCommands.forEach((cmd) => {
      if (typeof cmd === "string") {
        expect(isValidCommand(cmd)).toBe(false)
      }
    })
  })

  it("should have exactly 5 valid commands in VALID_COMMANDS set", () => {
    expect(VALID_COMMANDS.size).toBe(5)
    expect(VALID_COMMANDS.has("F")).toBe(true)
    expect(VALID_COMMANDS.has("B")).toBe(true)
    expect(VALID_COMMANDS.has("L")).toBe(true)
    expect(VALID_COMMANDS.has("R")).toBe(true)
    expect(VALID_COMMANDS.has("S")).toBe(true)
  })

  it("should have proper TypeScript types", () => {
    const validCmd: ValidCommand = "F"
    expect(validCmd).toBe("F")
  })
})
