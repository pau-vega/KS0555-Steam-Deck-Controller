import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { useEffect, useRef, useState } from "react"

import { Direction } from "../types"

const STEAM_DECK_VENDOR_ID = "057e"
const STEAM_DECK_PRODUCT_ID = "2009"

function isSteamDeck(gamepad: Gamepad): boolean {
  const id = gamepad.id.toLowerCase()
  return (
    id.includes("steam deck") ||
    id.includes("galileo") ||
    (id.includes(STEAM_DECK_VENDOR_ID) && id.includes(STEAM_DECK_PRODUCT_ID))
  )
}

export function useGamepad() {
  const [direction, setDirection] = useState<Direction>("S")
  const [gamepadConnected, setGamepadConnected] = useState(false)
  const [isDeck, setIsDeck] = useState(false)
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
        detectSteamDeck()
      })
      unlistenersRef.current.push(unlistenConnected)

      const unlistenDisconnected = await listen<{ name: string }>("gamepad-disconnected", (event) => {
        if (cancelled) return
        setGamepadConnected(false)
        setDirection("S")
        setIsDeck(false)
      })
      unlistenersRef.current.push(unlistenDisconnected)

      detectSteamDeck()
    }

    const detectSteamDeck = () => {
      const gamepads = navigator.getGamepads?.() ?? []
      const deck = gamepads.find((gp) => gp && isSteamDeck(gp))
      setIsDeck(!!deck)
      if (deck && !cancelled) {
        console.log("[SteamDeck] Detected:", deck.id)
      }
    }

    setup()

    return () => {
      cancelled = true
      unlistenersRef.current.forEach((fn) => fn())
      unlistenersRef.current = []
    }
  }, [])

  return { direction, gamepadConnected, isDeck }
}
