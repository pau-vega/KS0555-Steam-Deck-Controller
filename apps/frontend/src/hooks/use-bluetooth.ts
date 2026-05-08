import { invoke } from "@tauri-apps/api/core"
import { listen, type UnlistenFn } from "@tauri-apps/api/event"
import { useState, useCallback, useRef, useEffect } from "react"

type BluetoothState = "disconnected" | "connecting" | "connected"

export function useBluetooth() {
  const [state, setState] = useState<BluetoothState>("disconnected")
  const unlistenersRef = useRef<UnlistenFn[]>([])

  const connect = useCallback(async () => {
    setState("connecting")
    try {
      await invoke("ble_connect")
    } catch (error) {
      setState("disconnected")
      throw error
    }
  }, [])

  const send = useCallback((data: string) => {
    void invoke("ble_send", { command: data })
  }, [])

  useEffect(() => {
    let cancelled = false

    const setup = async () => {
      if (!window.__TAURI_INTERNALS__) return

      const unlisten = await listen<string>("ble-state-changed", (event) => {
        if (cancelled) return
        const payload = event.payload as "connecting" | "connected" | "disconnected"
        setState(payload)
      })
      unlistenersRef.current.push(unlisten)
    }

    setup()

    return () => {
      cancelled = true
      unlistenersRef.current.forEach((fn) => fn())
      unlistenersRef.current = []
    }
  }, [])

  return {
    connected: state === "connected",
    connecting: state === "connecting",
    unsupported: false as const,
    connect,
    send,
  }
}
