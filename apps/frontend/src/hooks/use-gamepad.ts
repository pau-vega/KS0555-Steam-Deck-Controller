import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { useEffect, useRef, useState } from "react"

import { Direction } from "../types"

export function useGamepad() {
  const [direction, setDirection] = useState<Direction>("S")
  const [gamepadConnected, setGamepadConnected] = useState(false)
  const [gamepadName, setGamepadName] = useState<string | null>(null)
  const unlistenersRef = useRef<UnlistenFn[]>([])

  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      if (!window.__TAURI_INTERNALS__) return

      const unlistenDirection = await listen<{ direction: Direction }>("gamepad-direction", (event) => {
        if (cancelled) return
        setDirection(event.payload.direction)
      })
      unlistenersRef.current.push(unlistenDirection)

      const unlistenConnected = await listen<{ name: string }>("gamepad-connected", (event) => {
        if (cancelled) return
        setGamepadConnected(true)
        setGamepadName(event.payload.name)
      })
      unlistenersRef.current.push(unlistenConnected)

      const unlistenDisconnected = await listen<{ name: string }>("gamepad-disconnected", (event) => {
        if (cancelled) return
        setGamepadConnected(false)
        setDirection("S")
        setGamepadName(null)
      })
      unlistenersRef.current.push(unlistenDisconnected)
    }

    setup()

    return () => {
      cancelled = true
      unlistenersRef.current.forEach((fn) => fn())
      unlistenersRef.current = []
    }
  }, [])

  return { direction, gamepadConnected, gamepadName, isDeck: false }
}
