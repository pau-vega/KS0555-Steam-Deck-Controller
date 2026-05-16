import type { Direction } from "../types"

/**
 * Firmware default PWM (per .planning/PROJECT.md Context section: "Default PWM 150 when omitted").
 * Within the Phase-20 validator accept range 80..=255. Temporary placeholder until Phase 21
 * wires analog (direction, pwm) through the gamepad adapter.
 */
export const DEFAULT_PWM: number = 150

/**
 * Encodes a Direction to the Phase-20 BLE wire format. Stop → `S\n`; F/B/L/R → `{dir}150\n`.
 * Output is byte-identical to Rust `Command::Display` for `Drive { dir, pwm: 150 }` / `Stop`.
 */
export function encodeCommand(direction: Direction): string {
  switch (direction) {
    case "F":
    case "B":
    case "L":
    case "R":
      return `${direction}${DEFAULT_PWM}\n`
    case "S":
      return "S\n"
    default: {
      const _exhaustive: never = direction
      throw new Error(`encodeCommand: unhandled Direction ${String(_exhaustive)}`)
    }
  }
}
