import { memo, useCallback } from "react"

import type { Direction } from "../types"

import { useInvertControls } from "../hooks/use-invert-controls"
import { applyDirectionInversion } from "../lib/apply-direction-inversion"

interface ButtonDef {
  label: string
  command: Direction
  gridArea: string
  ariaLabel: string
}

const BUTTONS: ButtonDef[] = [
  { label: "◀", command: "L", gridArea: "2 / 1", ariaLabel: "Left" },
  { label: "■", command: "S", gridArea: "2 / 2", ariaLabel: "Stop" },
  { label: "▶", command: "R", gridArea: "2 / 3", ariaLabel: "Right" },
]

interface DirectionButtonProps {
  def: ButtonDef
  disabled: boolean
  onCommand: (command: Direction) => void
}

const DirectionButton = memo(function DirectionButton({ def, disabled, onCommand }: DirectionButtonProps) {
  const stateClass = disabled
    ? "opacity-40 cursor-not-allowed"
    : "hover:bg-surface hover:border-accent active:bg-accent active:scale-95"
  const palette = def.command === "S" ? "bg-error border-accent" : "bg-surface border-border"

  return (
    <button
      aria-label={def.ariaLabel}
      className={`w-20 h-20 rounded-xl text-2xl cursor-pointer transition-all duration-100 flex items-center justify-center border-2 ${stateClass} ${palette}`}
      onClick={() => onCommand(def.command)}
      disabled={disabled}
      style={{ gridArea: def.gridArea }}
    >
      {def.label}
    </button>
  )
})

interface InvertToggleButtonProps {
  disabled: boolean
}

const InvertToggleButton = memo(function InvertToggleButton({ disabled }: InvertToggleButtonProps) {
  const { inverted, toggleInvert } = useInvertControls()
  const pressedClass = inverted
    ? "bg-accent text-white border-accent"
    : "bg-surface text-gray-400 border-border hover:border-accent"
  const stateClass = disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"

  return (
    <button
      aria-label="Invert forward/backward controls"
      aria-pressed={inverted}
      className={`mt-3 px-3 py-1 text-xs rounded-lg border transition-colors ${pressedClass} ${stateClass}`}
      onClick={() => {
        void toggleInvert()
      }}
      disabled={disabled}
    >
      {inverted ? "🔄 Inverted" : "↕️ Normal"}
    </button>
  )
})

interface ControlPadProps {
  onCommand: (command: Direction) => void
  disabled: boolean
}

export const ControlPad = memo(function ControlPad({ onCommand, disabled }: ControlPadProps) {
  const { inverted } = useInvertControls()

  const handleCommand = useCallback(
    (raw: Direction) => {
      onCommand(applyDirectionInversion(raw, inverted))
    },
    [inverted, onCommand],
  )

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="grid grid-cols-3 grid-rows-3 gap-2 w-fit mx-auto">
        {BUTTONS.map((def) => (
          <DirectionButton key={def.command} def={def} disabled={disabled} onCommand={handleCommand} />
        ))}
      </div>
      <InvertToggleButton disabled={disabled} />
    </div>
  )
})
