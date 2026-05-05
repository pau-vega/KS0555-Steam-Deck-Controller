import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime"
import { useState, useEffect, useCallback, useRef } from "react"
import { ControlPad } from "./components/control-pad"
import { StatusBar } from "./components/status-bar"
import { useBluetooth } from "./hooks/use-bluetooth"
import { useGamepad } from "./hooks/use-gamepad"
export function App() {
  const [lastCommand, setLastCommand] = useState("S")
  const { connected: bleConnected, connecting, connect, send } = useBluetooth()
  const { direction, gamepadConnected } = useGamepad()
  const prevDirection = useRef("S")
  const sendCommand = useCallback(
    (cmd) => {
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
  return _jsxs("div", {
    className: "app",
    children: [
      _jsx("h1", { children: "\uD83E\uDD16 Robot Controller" }),
      _jsx(StatusBar, { bleConnected: bleConnected, gamepadConnected: gamepadConnected, connecting: connecting }),
      !bleConnected &&
        _jsx("button", {
          className: "px-6 py-3 rounded-xl bg-accent text-white font-medium text-lg disabled:opacity-50 cursor-pointer",
          onClick: () => void connect(),
          disabled: connecting,
          children: connecting ? "Connecting..." : "Connect Bluetooth",
        }),
      _jsx(ControlPad, { onCommand: sendCommand, disabled: !bleConnected }),
      _jsxs("div", {
        className: "text-lg p-3 bg-surface rounded-lg border border-border",
        children: ["Last command: ", _jsx("strong", { className: "text-accent text-xl", children: lastCommand })],
      }),
      _jsxs("div", {
        className: "text-center",
        children: [
          _jsx("span", { className: "text-sm text-gray-400", children: "Current direction: " }),
          _jsx("span", { className: "text-accent font-bold", children: direction }),
        ],
      }),
    ],
  })
}
