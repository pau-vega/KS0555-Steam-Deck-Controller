import type { Direction } from "../types"

export function applyDirectionInversion(raw: Direction, inverted: boolean): Direction {
  if (!inverted) return raw
  if (raw === "F") return "B"
  if (raw === "B") return "F"
  return raw
}
