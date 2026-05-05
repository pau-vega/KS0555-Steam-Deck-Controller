import { useState, useEffect, useCallback, useRef } from "react"

type Direction = "F" | "B" | "L" | "R" | "S"

const DEADZONE = 0.15

function getDirectionFromAxes(axes: Float32Array | readonly number[]): Direction {
  const x = axes[0] ?? 0
  const y = axes[1] ?? 0

  const absX = Math.abs(x)
  const absY = Math.abs(y)

  if (absX < DEADZONE && absY < DEADZONE) {
    return "S"
  }

  if (absY > absX) {
    return y < 0 ? "F" : "B"
  }

  return x < 0 ? "L" : "R"
}

export function useGamepad() {
  const [direction, setDirection] = useState<Direction>("S")
  const [gamepadConnected, setGamepadConnected] = useState(false)
  const frameRef = useRef<number>(0)
  const connectedRef = useRef(false)

  const pollGamepad = useCallback(() => {
    const gamepads = navigator.getGamepads()
    const gp = Array.from(gamepads).find((g) => g?.id.includes("Steam")) || gamepads[0]

    if (!gp) {
      frameRef.current = requestAnimationFrame(pollGamepad)
      return
    }

    if (!connectedRef.current) {
      connectedRef.current = true
      setGamepadConnected(true)
    }

    const newDirection = getDirectionFromAxes(gp.axes)
    setDirection(newDirection)

    frameRef.current = requestAnimationFrame(pollGamepad)
  }, [])

  useEffect(() => {
    frameRef.current = requestAnimationFrame(pollGamepad)

    const onConnected = () => setGamepadConnected(true)
    const onDisconnected = () => {
      connectedRef.current = false
      setGamepadConnected(false)
      setDirection("S")
    }

    window.addEventListener("gamepadconnected", onConnected)
    window.addEventListener("gamepaddisconnected", onDisconnected)

    return () => {
      cancelAnimationFrame(frameRef.current)
      window.removeEventListener("gamepadconnected", onConnected)
      window.removeEventListener("gamepaddisconnected", onDisconnected)
    }
  }, [pollGamepad])

  return { direction, gamepadConnected }
}
