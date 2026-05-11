import { invoke } from "@tauri-apps/api/core"
import { listen } from "@tauri-apps/api/event"
import { useState, useCallback, useEffect, useRef } from "react"

type BluetoothState = "disconnected" | "connecting" | "connected" | "unsupported"

const SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb"
const CHARACTERISTIC_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb"

function isTauri(): boolean {
  return typeof window !== "undefined" && "__TAURI__" in window
}

export function useBluetooth() {
  const [state, setState] = useState<BluetoothState>(() =>
    isTauri()
      ? "disconnected"
      : typeof navigator !== "undefined" && "bluetooth" in navigator
        ? "disconnected"
        : "unsupported",
  )
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null)

  useEffect(() => {
    if (!isTauri()) return

    let unlisten: (() => void) | undefined
    let cancelled = false

    async function setup() {
      const fn = await listen<string>("ble-state-changed", (event) => {
        if (cancelled) return
        setState(event.payload as BluetoothState)
      })
      if (!cancelled) {
        unlisten = fn
      } else {
        fn()
      }
    }
    setup()

    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [])

  const connect = useCallback(async () => {
    if (isTauri()) {
      setState("connecting")
      try {
        await invoke("ble_connect")
        setState("connected")
      } catch {
        setState("disconnected")
      }
      return
    }

    if (!("bluetooth" in navigator)) {
      setState("unsupported")
      return
    }

    setState("connecting")
    try {
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ name: "BT24" }],
        optionalServices: [SERVICE_UUID],
      })

      device.addEventListener("gattserverdisconnected", () => {
        setState("disconnected")
        characteristicRef.current = null
      })

      if (!device.gatt) {
        setState("disconnected")
        return
      }

      const server = await device.gatt.connect()
      const service = await server.getPrimaryService(SERVICE_UUID)
      const characteristic = await service.getCharacteristic(CHARACTERISTIC_UUID)
      characteristicRef.current = characteristic
      setState("connected")
    } catch {
      setState("disconnected")
    }
  }, [])

  const send = useCallback((data: string) => {
    if (isTauri()) {
      void invoke("ble_send", { command: data })
      return
    }

    const characteristic = characteristicRef.current
    if (!characteristic) return
    void characteristic.writeValue(new TextEncoder().encode(data))
  }, [])

  return {
    connected: state === "connected",
    connecting: state === "connecting",
    unsupported: state === "unsupported",
    connect,
    send,
  }
}
