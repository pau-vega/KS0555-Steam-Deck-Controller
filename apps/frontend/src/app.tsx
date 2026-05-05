import { useState, useEffect, useCallback, useRef } from "react"

import type { Direction } from "./types"

import { ControlPad } from "./components/control-pad"
import { StatusBar } from "./components/status-bar"
import { useBluetooth } from "./hooks/use-bluetooth"
import { useGamepad } from "./hooks/use-gamepad"

export function App() {
  const [lastCommand, setLastCommand] = useState<Direction>("S")
  const { connected: bleConnected, connecting, connect, send } = useBluetooth()
  const { direction, gamepadConnected } = useGamepad()
  const prevDirection = useRef<Direction>("S")

  const sendCommand = useCallback(
    (cmd: Direction) => {
      send(cmd)
      setLastCommand(cmd)
    },
    [send],
  )

  useEffect(() => {
    if (direction !== prevDirection.current) {
      sendCommand(direction)
      prevDirection.current = direction
    }
  }, [direction, sendCommand])

  return (
    <div className="app">
      <h1>🤖 Robot Controller</h1>
      <StatusBar bleConnected={bleConnected} gamepadConnected={gamepadConnected} connecting={connecting} />
      {!bleConnected && (
        <button
          className="px-6 py-3 rounded-xl bg-accent text-white font-medium text-lg disabled:opacity-50 cursor-pointer"
          onClick={() => void connect()}
          disabled={connecting}
        >
          {connecting ? "Connecting..." : "Connect Bluetooth"}
        </button>
      )}
      <ControlPad onCommand={sendCommand} disabled={!bleConnected} />
      <div className="text-lg p-3 bg-surface rounded-lg border border-border">
        Last command: <strong className="text-accent text-xl">{lastCommand}</strong>
      </div>
      <div className="text-center">
        <span className="text-sm text-gray-400">Current direction: </span>
        <span className="text-accent font-bold">{direction}</span>
      </div>
    </div>
  )
}
