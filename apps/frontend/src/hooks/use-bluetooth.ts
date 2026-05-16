import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useCallback, useEffect, useState } from "react"

import type { Direction } from "../types"

import { encodeCommand } from "../lib/encode-command"
import { isTauri } from "../lib/is-tauri"

type BluetoothState = "disconnected" | "connecting" | "connected"

export function useBluetooth() {
  const [state, setState] = useState<BluetoothState>("disconnected")
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isTauri()) return

    let unlisten: (() => void) | undefined
    let cancelled = false

    const setup = async () => {
      try {
        const fn = await listen<string>("ble-state-changed", (event) => {
          if (cancelled) return
          setState(event.payload as BluetoothState)
          setError(null)
        })
        if (cancelled) fn()
        else unlisten = fn
      } catch (e) {
        console.error("Failed to set up BLE event listener:", e)
      }
    }

    void setup()

    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [])

  const connect = useCallback(async () => {
    setError(null)
    if (!isTauri()) return
    setState("connecting")
    try {
      await invoke("ble_connect")
      setState("connected")
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      console.error("BLE connect failed:", e)
      setError(msg)
      setState("disconnected")
    }
  }, [])

  const send = useCallback((direction: Direction) => {
    if (!isTauri()) return
    const payload = encodeCommand(direction)
    invoke("ble_send", { command: payload }).catch((e) => {
      const msg = e instanceof Error ? e.message : String(e)
      console.error("BLE send failed:", e)
      setError(msg)
    })
  }, [])

  return {
    connected: state === "connected",
    connecting: state === "connecting",
    unsupported: false,
    connect,
    send,
    error,
  }
}
