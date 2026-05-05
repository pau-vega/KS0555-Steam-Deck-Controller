import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useCallback, useRef } from "react";
import { ControlPad } from "./components/control-pad";
import { StatusBar } from "./components/status-bar";
import { useGamepad } from "./hooks/use-gamepad";
import { useWebSocket } from "./hooks/use-websocket";
export function App() {
    const [lastCommand, setLastCommand] = useState("S");
    const { connected: wsConnected, connecting, send, autoReconnect } = useWebSocket();
    const { direction, gamepadConnected } = useGamepad();
    const prevDirection = useRef("S");
    const sendCommand = useCallback((cmd) => {
        send(cmd);
        setLastCommand(cmd);
    }, [send]);
    useEffect(() => {
        if (direction !== prevDirection.current) {
            sendCommand(direction);
            prevDirection.current = direction;
        }
    }, [direction, sendCommand]);
    useEffect(() => {
        autoReconnect();
    }, [wsConnected, autoReconnect]);
    return (_jsxs("div", { className: "app", children: [_jsx("h1", { children: "\uD83E\uDD16 Robot Controller" }), _jsx(StatusBar, { wsConnected: wsConnected, gamepadConnected: gamepadConnected, connecting: connecting }), _jsx(ControlPad, { onCommand: sendCommand, disabled: !wsConnected }), _jsxs("div", { className: "text-lg p-3 bg-surface rounded-lg border border-border", children: ["Last command: ", _jsx("strong", { className: "text-accent text-xl", children: lastCommand })] }), _jsxs("div", { className: "text-center", children: [_jsx("span", { className: "text-sm text-gray-400", children: "Current direction: " }), _jsx("span", { className: "text-accent font-bold", children: direction })] })] }));
}
