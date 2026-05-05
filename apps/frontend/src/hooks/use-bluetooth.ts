import { useState, useCallback, useRef } from "react"

const SERVICE_UUID = "0000ffe0-0000-1000-8000-00805f9b34fb"
const CHARACTERISTIC_UUID = "0000ffe1-0000-1000-8000-00805f9b34fb"

type BluetoothState = "disconnected" | "connecting" | "connected" | "unsupported"

export function useBluetooth() {
  const [state, setState] = useState<BluetoothState>(() =>
    typeof navigator !== "undefined" && "bluetooth" in navigator ? "disconnected" : "unsupported"
  )
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null)

  const connect = useCallback(async () => {
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
