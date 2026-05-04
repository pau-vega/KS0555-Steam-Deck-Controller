import { useState, useEffect, useCallback, useRef } from "react";
import { useWebSocket } from "./hooks/use-websocket";
import { useGamepad } from "./hooks/use-gamepad";
import { ControlPad } from "./components/control-pad";
import { StatusBar } from "./components/status-bar";

type Direction = "F" | "B" | "L" | "R" | "S";

export function App() {
  const [lastCommand, setLastCommand] = useState<Direction>("S");
  const { connected: wsConnected, send, autoReconnect } = useWebSocket("ws://localhost:8080");
  const { direction, gamepadConnected } = useGamepad();
  const prevDirection = useRef<Direction>("S");

  const sendCommand = useCallback(
    (cmd: Direction) => {
      send(JSON.stringify({ type: "command", command: cmd }));
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
  }, [wsConnected]);

  return (
    <div className="app">
      <h1>🤖 Robot Controller</h1>
      <StatusBar wsConnected={wsConnected} gamepadConnected={gamepadConnected} />
      <ControlPad onCommand={sendCommand} disabled={!wsConnected} />
      <div className="last-command">
        Last command: <strong>{lastCommand}</strong>
      </div>
    </div>
  );
}
