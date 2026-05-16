import type { UnlistenFn } from "@tauri-apps/api/event"

import { listen } from "@tauri-apps/api/event"
import { useEffect, useRef, useState } from "react"

import type { Direction } from "../types"

import { applyDirectionInversion } from "../lib/apply-direction-inversion"
import { useInvertControls } from "./use-invert-controls"

export function useGamepad() {
  const [direction, setDirection] = useState<Direction>("S")
  const [gamepadConnected, setGamepadConnected] = useState(false)
  const [gamepadName, setGamepadName] = useState<string | null>(null)
  const unlistenersRef = useRef<UnlistenFn[]>([])
  const { inverted, toggleInvert } = useInvertControls()
  const invertedRef = useRef(inverted)

  useEffect(() => {
    invertedRef.current = inverted
  }, [inverted])

  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      if (!window.__TAURI_INTERNALS__) return

      const unlistenDirection = await listen<{ command: string }>("gamepad-direction", (event) => {
        if (cancelled) return
        const cmd = event.payload.command as string
        const dirChar = cmd[0] as Direction
        const invertedDir = applyDirectionInversion(dirChar, invertedRef.current)
        setDirection(invertedDir)
      })
      unlistenersRef.current.push(unlistenDirection)

      const unlistenConnected = await listen<{ name: string }>("gamepad-connected", (event) => {
        if (cancelled) return
        setGamepadConnected(true)
        setGamepadName(event.payload.name)
      })
      unlistenersRef.current.push(unlistenConnected)

      const unlistenDisconnected = await listen<{ name: string }>("gamepad-disconnected", () => {
        if (cancelled) return
        setGamepadConnected(false)
        setDirection("S")
        setGamepadName(null)
      })
      unlistenersRef.current.push(unlistenDisconnected)
    }

    void setup()

    return () => {
      cancelled = true
      unlistenersRef.current.forEach((fn) => fn())
      unlistenersRef.current = []
    }
  }, [])

  return { direction, gamepadConnected, gamepadName, isDeck: false, inverted, toggleInvert }
}
