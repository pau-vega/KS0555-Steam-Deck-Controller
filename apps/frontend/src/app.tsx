import { useState, useEffect, useCallback, useRef } from "react"

import type { Direction } from "./types"

import { ControlPad } from "./components/control-pad"
import { StatusBar } from "./components/status-bar"
import { useGamepad } from "./hooks/use-gamepad"
import { useWebSocket } from "./hooks/use-websocket"

export function App() {
  const [lastCommand, setLastCommand] = useState<Direction>("S");
  const { connected: wsConnected, connecting, send, autoReconnect } = useWebSocket();
  const { direction, gamepadConnected } = useGamepad();
  const prevDirection = useRef<Direction>("S");

  const sendCommand = useCallback(
    (cmd: Direction) => {
      send(cmd);
      setLastCommand(cmd);
    },
    [send],
  );

  useEffect(() => {
    if (direction !== prevDirection.current) {
      sendCommand(direction);
      prevDirection.current = direction;
    }
  }, [direction, sendCommand]);

  useEffect(() => {
    autoReconnect();
  }, [wsConnected, autoReconnect]);

  return (
    <div className="app">
      <h1>🤖 Robot Controller</h1>
      <StatusBar wsConnected={wsConnected} gamepadConnected={gamepadConnected} connecting={connecting} />
      <ControlPad onCommand={sendCommand} disabled={!wsConnected} />
      <div className="text-lg p-3 bg-surface rounded-lg border border-border">
        Last command: <strong className="text-accent text-xl">{lastCommand}</strong>
      </div>
      <div className="text-center">
        <span className="text-sm text-gray-400">Current direction: </span>
        <span className="text-accent font-bold">{direction}</span>
      </div>
    </div>
  );
}
